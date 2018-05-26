// @utilities
const {
  createPublisher,
  findPlayerById,
  generateToken,
  getNTPTime,
  sendAbortData,
  sendSessionData,
  sendStartData,
  validateToken,
  webSocketSend
} = require('../utilities');

// @Constants
const {
  SERVER_MIN_GAME_PLAYERS,
  SESSION_MSG_TYPE_ABORT,
  SESSION_MSG_TYPE_CREATE,
  SESSION_MSG_TYPE_CREATED,
  SESSION_MSG_TYPE_END,
  SESSION_MSG_TYPE_ERR,
  SESSION_MSG_TYPE_INFO,
  SESSION_MSG_TYPE_INIT_SENT,
  SESSION_MSG_TYPE_INIT_SUCCESS,
  SESSION_MSG_TYPE_PLAYER_DISCONNECTED,
  SESSION_MSG_TYPE_PLAYER_READY,
  SESSION_MSG_TYPE_PLAYER_VALIDATED,
  SESSION_MSG_TYPE_START,
  SESSION_POST_ABORT_PROCESS_TTL,
  SESSION_SC_COMM_ACK,
  SESSION_SC_COMM_END,
  SESSION_SC_COMM_LOAD_FINISH,
  SESSION_SC_COMM_START_SYNC,
  SESSION_SC_COMM_UPDATE,
  SESSION_SYNC_START_EMMITING_OFFSET,
  SESSION_SYNC_START_OFFSET,
  SESSION_UPDATE_RATE
} = require('../constants');

// @Model
const Player = require('./serverPlayer');

class SessionProccess {
  constructor() {
    this.id = 0;
    this.players = [];
    this.gameStarted = false;
    this.playersValidated = false;
    this.syncStarted = false;
    this.readyCounterStarted = false;

    this.abortSession = this.abortSession.bind(this);
    this.buildMessage = this.buildMessage.bind(this);
    this.handlePublisherIncomingData = this.handlePublisherIncomingData.bind(this);
    this.initSession = this.initSession.bind(this);
    this.setPlayerReady = this.setPlayerReady.bind(this);
    this.startSession = this.startSession.bind(this);
    this.syncClients = this.syncClients.bind(this);
    this.validatePlayer = this.validatePlayer.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);

    //Forked session process reducer
    process.on('message', data => {
      switch (data.type) {
        case SESSION_MSG_TYPE_ABORT:
          this.abortSession();
          break;
        case SESSION_MSG_TYPE_CREATE:
          this.initSession(data.payload);
          break;
        case SESSION_MSG_TYPE_INIT_SUCCESS:
          this.playersValidated = true;
          break;
        case SESSION_MSG_TYPE_START:
          this.gameStarted = true;
          this.syncClients();
        default:
          break;
      }
    });
  }

  //Initializes session publisher
  initSession(data){
    createPublisher((err, pub) => {
      if(err) {
        process.send({
          type: SESSION_MSG_TYPE_ERR,
          payload: `game session error while creating`
        })
      } else {
        const port = pub.port;
        this.id = port;
        this.publisher = pub.pub;
        data.players.forEach(player => {
          player.sessionConnected = true;
          this.players.push(Object.assign(new Player(), player));
        });
        this.level = data.level;
        this.sessionToken = data.token;

        process.send(this.buildMessage(SESSION_MSG_TYPE_CREATED, port));

        this.publisher.on('connection', ws => {
          ws.on('message', message => {
            try {
              const incomingData = JSON.parse(message);
              const data = {
                type: incomingData.type,
                payload: incomingData.payload,
                connection: ws
              }
              this.handlePublisherIncomingData(data);
            } catch(err) {
              //ignores non JSON parseable msgs
            }
          });
        })
      }
    });
  }

  //Aborts a recently started session
  abortSession(){
    this.players.forEach(player => {
      if(player.sessionValidated && player.sessionConnected) {
        const abortData = {
          type: SESSION_SC_COMM_END
        };
        webSocketSend(player, abortData, this.handleDisconnect);
      }
    });
    setTimeout(() => {
      process.exit(0);
    }, SESSION_POST_ABORT_PROCESS_TTL);
  }

  //Synchonizes clients and then starts game
  syncClients() {
    if(this.gameStarted) {
      getNTPTime((reply) => {
        if(reply.error) {
          const abortMsg = `game session ${this.id} failed sync, aborting`;
          process.send(this.buildMessage(SESSION_MSG_TYPE_ABORT, payload));
          this.abortSession();
        } else {
          const startTime = reply.ntpTime + SESSION_SYNC_START_OFFSET;
          this.startSession(startTime);
        }
      })
    }
  }

  //Sends the start time with sincronization time and starts game update progress
  startSession(startTime) {
    this.players.forEach(player => {
      if(player.sessionReady && player.sessionConnected) {
        const payload = {
          type: SESSION_SC_COMM_START_SYNC,
          timeStamp: startTime
        };
        webSocketSend(player, payload, this.handleDisconnect);
      }
    });

    const infoMsg = `session ${this.id} sync data sent, starting in 5 segs...`;
    process.send(this.buildMessage(SESSION_MSG_TYPE_INFO, infoMsg));

    this.players.forEach(player => {
      player.updateSessionState(this.level.startingPosX, this.level.startingPosY, this.level.startingDirectionId);
    });
    setTimeout(() => {
      this.gameLoop();
    }, SESSION_SYNC_START_EMMITING_OFFSET);
  }

  //Produces de game loop
  gameLoop() {
    this.gameLoop = setInterval(() => {
      const players = this.players.map(player => {
        return {
          playerId: player.internalId,
          position: {
            x: player.sessionState.posX,
            y: player.sessionState.posY,
          },
          directionId: player.sessionState.directionId,
          finished: player.sessionState.finished
        };
      });
      this.players.forEach(player => {
        if(player.sessionReady && player.sessionConnected) {
          const data = {
            sessionToken: this.sessionToken.token,
            players: players
          };
          const updateData = this.buildMessage(SESSION_SC_COMM_UPDATE, data);
          webSocketSend(player, updateData, this.handleDisconnect);
        }
      });
    }, SESSION_UPDATE_RATE);
  }

  //Validates a player connection to session
  validatePlayer(validateData, connectionSocket) {
    const sessionToken = validateData.sessionToken;
    const playerId = validateData.playerId;
    const playerToken = validateData.playerToken;

    if(!this.playersValidated && validateToken(sessionToken, this.sessionToken.secret)) {
      const player = findPlayerById(playerId, this.players);
      //TODO: uncomment when it is not a mock test
      if(player && !player.sessionValidated /*&& player.validate(playerToken)*/) {
        player.sessionSocket = connectionSocket;
        player.sessionValidated = true;
        process.send(this.buildMessage(SESSION_MSG_TYPE_PLAYER_VALIDATED, { playerId: player.internalId }));
      }
    }
  }

  //Sets a player ready when level loading finishes
  setPlayerReady(playerData) {
    const sessionToken = playerData.sessionToken;
    const playerId = playerData.playerId;
    const playerToken = playerData.playerToken;

    if(this.playersValidated && !this.gameStarted && validateToken(sessionToken, this.sessionToken.secret)) {
      const player = findPlayerById(playerId, this.players);
      //TODO: uncomment when it is not a mock test
      if(player && player.sessionValidated && !player.sessionReady /*&& player.validate(playerToken)*/) {
        const msgPayload = {
          playerId: player.internalId,
          initCounter: !this.syncStarted
        };

        if(!this.syncStarted) {
          this.syncStarted = true;
        }

        player.sessionReady = true;
        process.send(this.buildMessage(SESSION_MSG_TYPE_PLAYER_READY, msgPayload));
      }
    }
  }

  //Handles session incoming data
  handlePublisherIncomingData(data){
    switch(data.type){
      case SESSION_SC_COMM_ACK:
        this.validatePlayer(data.payload, data.connection);
        break;
      case SESSION_SC_COMM_LOAD_FINISH:
        this.setPlayerReady(data.payload);
        break;
      default:
        break;
    }
  }

  //Handles a client disconnect event
  handleDisconnect(player) {
    player.sessionConnected = false;
    const playerData = { playerId: player.internalId };
    process.send(this.buildMessage(SESSION_MSG_TYPE_PLAYER_DISCONNECTED, playerData));
  }

  //builds a message for parent process
  buildMessage(type, payload){
    return {
      type,
      payload: payload
    }
  }
}

const sessionProccess = new SessionProccess();
