// @Vendor
const childProcess = require('child_process');

// @Utilities
const {
  findPlayerById,
  generateToken,
  logger
} = require('../utilities');

// @Constants
const {
  SESSION_AFTER_FIRST_LOAD_VALIDATION_TIME,
  SESSION_CONNECTION_VALIDATION_TIME,
  SESSION_MIN_PLAYERS_ABORT,
  OBSERVER_MSG_ACTION_ABORT,
  OBSERVER_MSG_ACTION_END,
  OBSERVER_MSG_ACTION_PLAYER_CONNECTION_LOST,
  OBSERVER_MSG_ACTION_START,
  OBSERVER_MSG_ACTION_VALIDATE,
  SESSION_MSG_TYPE_ABORT,
  SESSION_MSG_TYPE_CREATE,
  SESSION_MSG_TYPE_CREATED,
  SESSION_MSG_TYPE_END,
  SESSION_MSG_TYPE_ERR,
  SESSION_MSG_TYPE_INFO,
  SESSION_MSG_TYPE_INIT_SUCCESS,
  SESSION_MSG_TYPE_PLAYER_DISCONNECTED,
  SESSION_MSG_TYPE_PLAYER_READY,
  SESSION_MSG_TYPE_PLAYER_VALIDATED,
  SESSION_MSG_TYPE_START
} = require('../constants');

class GameSession {
  constructor(level, players, observer) {
    this.sessionObserver = observer;
    this.level = level;
    this.players = players;
    this.token = generateToken();
    this.ended = false;
    this.session = '';
    this.sessionId = '';
    this.validatedPlayers = 0;
    this.readyPlayers = 0;

    this.abortGame = this.abortGame.bind(this);
    this.buildMessage = this.buildMessage.bind(this);
    this.finish = this.finish.bind(this);
    this.handleIncomingMsg = this.handleIncomingMsg.bind(this);
    this.initializeSession = this.initializeSession.bind(this);
    this.initValidationCounter = this.initValidationCounter.bind(this);
    this.initReadyCounter = this.initReadyCounter.bind(this);
    this.playerInSession = this.playerInSession.bind(this);
    this.removePlayer = this.removePlayer.bind(this);
    this.sendSessionData = this.sendSessionData.bind(this);
    this.setValidated = this.setValidated.bind(this);
    this.setStarted = this.setStarted.bind(this);
    this.startGame = this.startGame.bind(this);
  }

  initializeSession() {
    this.session = childProcess.fork('./model/sessionProcess.js');

    const payload = {
      players: this.players,
      level: this.level,
      token: this.token
    };

    this.session.send(this.buildMessage(SESSION_MSG_TYPE_CREATE, payload));

    this.session.on('message', msg => {
      this.handleIncomingMsg(msg);
    })
  }

  //Inits validation counter for player game session validation
  initValidationCounter() {
    setTimeout(() => {
      this.sessionObserver(this, OBSERVER_MSG_ACTION_VALIDATE);
    }, SESSION_CONNECTION_VALIDATION_TIME);
  }

  //Inits countdown until game start
  initReadyCounter() {
    setTimeout(() => {
      this.sessionObserver(this, OBSERVER_MSG_ACTION_START);
    }, SESSION_AFTER_FIRST_LOAD_VALIDATION_TIME);
  }

  //Removes a player from the game session
  removePlayer(playerId, notifySessionProcess) {
    const player = findPlayerById(playerId, this.players);
    if(player) {
      if(player.sessionValidated) {
        this.validatedPlayers -= 1;
      }
      if(player.sessionReady) {
        this.readyPlayers -= 1;
      }
      this.players = this.players.filter(player => {
        return player.internalId != playerId
      });
      player.setInitialState();
      if(notifySessionProcess) {
        this.session.send(this.buildMessage(SESSION_MSG_TYPE_PLAYER_DISCONNECTED, playerId));
      }
      this.sessionObserver(playerId, OBSERVER_MSG_ACTION_PLAYER_CONNECTION_LOST);
      if(this.players.length <= SESSION_MIN_PLAYERS_ABORT) {
        this.sessionObserver(this, OBSERVER_MSG_ACTION_ABORT);
      }
    }
  }

  //Returns if a player is in a game session
  playerInSession(playerId) {
    return this.players.find(player => {
      return player.internalId == playerId;
    });
  }

  //Starts game
  startGame() {
    this.session.send(this.buildMessage(SESSION_MSG_TYPE_START));
  }

  //Aborts game start
  abortGame() {
    this.session.send(this.buildMessage(SESSION_MSG_TYPE_ABORT));
    this.sessionObserver(this, OBSERVER_MSG_ACTION_ABORT);
  }

  //Sends game session Data to client
  sendSessionData(port) {
    const sessionData = {
      sessionId: this.sessionId,
      sessionToken: this.token.token,
      sessionPort: port
    };
    this.players.forEach(player => {
      player.queueListener(sessionData);
    });
    this.initValidationCounter();
  }

  //Acts as a reducer between de gameSession controller and the session child process
  handleIncomingMsg(msg) {
    if(msg) {
      switch(msg.type) {
        case SESSION_MSG_TYPE_INFO:
          logger(msg.payload);
          break;
        case SESSION_MSG_TYPE_CREATED:
          this.sessionId = msg.payload;
          this.sendSessionData(msg.payload);
          logger(`game session ${this.sessionId} has been created`);
          break;
        case SESSION_MSG_TYPE_PLAYER_VALIDATED:
          this.validatedPlayers += 1;
          logger(`player ${msg.payload.playerId} validated on game session ${this.sessionId}`);
          break;
        case SESSION_MSG_TYPE_PLAYER_READY:
          this.readyPlayers += 1;
          if(msg.payload.initCounter) {
            this.initReadyCounter();
          }
          logger(`player ${msg.payload.playerId} ready to start on game session ${this.sessionId}`);
          break;
        case SESSION_MSG_TYPE_PLAYER_DISCONNECTED:
          this.removePlayer(msg.payload.playerId);
          break;
        case SESSION_MSG_TYPE_END:
          this.finish();
          break;
        case SESSION_MSG_TYPE_ABORT:
          logger(msg.payload);
          break;
        case SESSION_MSG_TYPE_ERR:
          logger(msg.payload);
          break;
        default:
          break;
      }
    }
  }

  //Sets game session validated
  setValidated() {
    this.session.send(this.buildMessage(SESSION_MSG_TYPE_INIT_SUCCESS));
  }

  //Sets game session started
  setStarted() {
    this.session.send(this.buildMessage(SESSION_MSG_TYPE_START));
  }

  //Builds a message object
  buildMessage(type, payload) {
    return {
      type,
      payload
    }
  }

  //Successful end for the game session
  finish() {
    this.players.forEach(player => {
      player.setInitialState();
    });
    this.sessionObserver(this, OBSERVER_MSG_ACTION_END);
  }
}

module.exports = GameSession;
