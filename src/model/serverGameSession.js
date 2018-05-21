// @Vendor
const childProcess = require('child_process');

// @Utilities
const {
  findPlayerById,
  generateToken,
  getNTPTime,
  logger,
  validateToken
} = require('../utilities');

// @Constants
const {
  SESSION_ACTION_VALIDATE,
  SESSION_ACTION_START,
  SESSION_ACTION_ABORT,
  SESSION_MSG_TYPE_ABORT,
  SESSION_MSG_CLIENT_LOAD_FINISHED,
  SESSION_MSG_TYPE_CREATE,
  SESSION_MSG_TYPE_END,
  SESSION_MSG_TYPE_ERR,
  SESSION_MSG_TYPE_INIT_SUCCESS,
  SESSION_MSG_TYPE_INFO,
  SESSION_MSG_TYPE_INIT_SENT,
  SESSION_MSG_TYPE_CREATED,
  SESSION_MSG_TYPE_START
} = require('../constants');

class GameSession {
  constructor(level, players, observer) {
    this.sessionObserver = observer;
    this.level = level;
    this.players = players;
    this.token = generateToken();
    this.initialized = false;
    this.inProgress = false;
    this.ended = false;
    this.session = '';
    this.sessionId = '';
    this.validatedPlayers = 0;
    this.readyPlayers = 0;
    this.validated = false;
    this.syncStarted = false;
    this.started = false;

    this.abortGame = this.abortGame.bind(this);
    this.buildMessage = this.buildMessage.bind(this);
    this.handleIncomingMsg = this.handleIncomingMsg.bind(this);
    this.initializeSession = this.initializeSession.bind(this);
    this.initReadyCounter = this.initReadyCounter.bind(this);
    this.initValidationCounter = this.initValidationCounter.bind(this);
    this.removePlayer = this.removePlayer.bind(this);
    this.playerInSession = this.playerInSession.bind(this);
    this.playerReady = this.playerReady.bind(this);
    this.startGame = this.startGame.bind(this);
    this.validatePlayer = this.validatePlayer.bind(this);
  }

  initializeSession() {
    this.session = childProcess.fork(`./model/sessionProcess.js`);

    const payload = {
      players: this.players,
      levelId: this.level.id,
      token: this.token.token
    };

    this.session.send(this.buildMessage(SESSION_MSG_TYPE_CREATE, payload));

    this.session.on('message', (msg) => {
      this.handleIncomingMsg(msg);
    })
  }

  //Decides if a player init reply is valid and (if valid) set the player validated
  validatePlayer(playerId, playerToken, sessionToken) {
    if(!this.validated && validateToken(sessionToken, this.token.secret)) {
      const player = findPlayerById(playerId, this.players);
      if(player && player.validate(playerToken)) {
        player.sessionValidated = true;
        this.validatedPlayers += 1;
        logger(`player ${playerId} validated on game session ${this.sessionId}`);
      }
    }
  }

  //Sets a player ready to start the game
  playerReady(playerId, playerToken, sessionToken) {
    if(this.validated && validateToken(sessionToken, this.token.secret)) {
      const player = findPlayerById(playerId, this.players);
      if(player && player.validate(playerToken) && !player.sessionReady) {
        player.sessionReady = true;
        logger(`player ${playerId} ready to start game session ${this.sessionId}`);
        if(!this.syncStarted){
          this.initReadyCounter();
        }
      }
    }
  }

  //Inits validation counter for player game session validation
  initValidationCounter() {
    setTimeout(() => {
      const validatedPlayers = this.players.filter(player => {
        return player.sessionValidated;
      });
      this.validatedPlayers = validatedPlayers.length
      this.sessionObserver(this, SESSION_ACTION_VALIDATE);
    }, 5000);
  }

  //Inits countdown until game start
  initReadyCounter() {
    this.syncStarted = true;
    setTimeout(() => {
      const readyPlayers = this.players.filter(player => {
        return player.sessionReady;
      });
      this.readyPlayers = readyPlayers.length;
      this.sessionObserver(this, SESSION_ACTION_START);
    }, 10000);
  }

  //Removes a player from the game session
  removePlayer(playerId) {
    this.players == this.players.filter(player => {
      return player.internalId != playerId
    })
  }

  //Returns if a player is in a game session
  playerInSession(playerId) {
    return this.players.find(player => {
      return player.internalId == playerId;
    });
  }

  //Starts game
  startGame() {
    if(!this.validated) {
      this.validated = true;
    } else {
      getNTPTime((reply) => {
        if(reply.error) {
          logger(`game session ${this.sessionId} failed sync, aborting`)
          this.abort();
        } else {
          const time = reply.ntpTime + 10000;
          const players = this.players.filter(player => {
            return player.sessionReady;
          }).map(player => {
            return {
              sessionIp: player.sessionIp,
              sessionPort: player.sessionPort
            };
          });

          const payload = {
            startTime: time,
            players: players
          };
          this.session.send(this.buildMessage(SESSION_MSG_TYPE_START, payload));
        }
      })
    }
  }

  //Aborts game start
  abortGame() {
    const validatedPlayers = this.players.filter(player => {
      return player.sessionValidated;
    }).map(player => {
      return {
        sessionIp: player.sessionIp,
        sessionPort: player.sessionPort
      };
    })
    this.session.send(this.buildMessage(SESSION_MSG_TYPE_ABORT, validatedPlayers));
    this.sessionObserver(this, SESSION_ACTION_ABORT);
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
          logger(`game session ${this.sessionId} has been created`);
          break;
        case SESSION_MSG_TYPE_INIT_SUCCESS:
          this.validatePlayer(msg.payload.playerId, msg.payload.playerToken, msg.payload.sessionToken);
          break;
        case SESSION_MSG_TYPE_INIT_SENT:
          this.initValidationCounter();
          break;
        case SESSION_MSG_CLIENT_LOAD_FINISHED:
          this.playerReady(msg.payload.playerId, msg.payload.playerToken, msg.payload.sessionToken);
          break;
        case SESSION_MSG_TYPE_END:
          break;
        case SESSION_MSG_TYPE_ABORT:
          break;
        case SESSION_MSG_TYPE_ERR:
          logger(msg.payload);
          break;
        default:
          break;
      }
    }
  }

  buildMessage(type, payload) {
    return {
      type,
      payload
    }
  }
}

module.exports = GameSession;
