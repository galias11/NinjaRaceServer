// @utilities
const {
  createPublisher,
  findPlayerById,
  getNTPTime,
  schemas,
  validateData,
  validateToken,
  webSocketSend,
  webSocketTerminate
} = require('../utilities');

// @Constants
const {
  PLAYER_STATE_FINISHED,
  PLAYER_STATE_INIT,
  PLAYER_FINISH_STATE_COMPLETED,
  PLAYER_FINISH_STATE_NOT_COMPLETED,
  SESSION_FINISH_TIMER,
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
  SESSION_MSG_TYPE_START,
  SESSION_POST_ABORT_PROCESS_TTL,
  SESSION_SC_COMM_ACK,
  SESSION_SC_COMM_CREATED,
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
    this.abortStarted = false;
    this.finishStarted = false;
    this.endingCounter = undefined;

    this.abortSession = this.abortSession.bind(this);
    this.buildMessage = this.buildMessage.bind(this);
    this.checkEndingCondition = this.checkEndingCondition.bind(this);
    this.confirmSession = this.confirmSession.bind(this);
    this.endSession = this.endSession.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handlePublisherIncomingData = this.handlePublisherIncomingData.bind(this);
    this.initSession = this.initSession.bind(this);
    this.setPlayerReady = this.setPlayerReady.bind(this);
    this.startFinishCounter = this.startFinishCounter.bind(this);
    this.startSession = this.startSession.bind(this);
    this.syncClients = this.syncClients.bind(this);
    this.updatePlayer = this.updatePlayer.bind(this);
    this.validatePlayer = this.validatePlayer.bind(this);

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
          this.confirmSession();
          break;
        case SESSION_MSG_TYPE_START:
          this.gameStarted = true;
          this.syncClients();
          break;
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
          payload: 'game session error while creating'
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
            if(!this.abortStarted) {
              let incomingData;
              try {
                incomingData = JSON.parse(message);
              } catch(err) {
                //ignores non JSON parseable msgs
              }
              if(validateData(incomingData, schemas.sessionIncomingData)) {
                const data = {
                  type: incomingData.type,
                  payload: incomingData.payload,
                  connection: ws
                }
                this.handlePublisherIncomingData(data);
              }
            }
          });
        })
      }
    });
  }

  //Aborts a recently started session
  abortSession(){
    this.abortStarted = true;
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
          process.send(this.buildMessage(SESSION_MSG_TYPE_ABORT, abortMsg));
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
      player.updateSessionState(this.level.startingPosX, this.level.startingPosY,
                                this.level.startingDirectionId, PLAYER_STATE_INIT);
    });
    setTimeout(() => {
      this.gameLoop();
    }, SESSION_SYNC_START_EMMITING_OFFSET);
  }

  //Produces de game loop
  gameLoop() {
    this.gameLoopInterval = setInterval(() => {
      const players = this.players.map(player => {
        return {
          playerId: player.internalId,
          position: {
            x: player.sessionState.posX,
            y: player.sessionState.posY,
          },
          directionId: player.sessionState.directionId,
          state: player.sessionState.state
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
    //const playerToken = validateData.playerToken;

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
      if(player && player.sessionValidated && !player.sessionReady && player.validate(playerToken)) {
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
      case SESSION_SC_COMM_UPDATE:
        this.updatePlayer(data.payload);
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

  //Updates player state in the session
  updatePlayer(playerData) {
    if(playerData && validateToken(playerData.sessionToken, this.sessionToken.secret)) {
      const player = findPlayerById(playerData.playerId, this.players);
      if(player && validateToken(playerData.playerToken, player.secret)) {
        player.updateSessionState(playerData.position.x, playerData.position.y,
                                  playerData.directionId, playerData.state);
        if(playerData.state == PLAYER_STATE_FINISHED) {
          if(!this.endingCounter) {
            this.startFinishCounter();
          }
          this.checkEndingCondition();
        }
      }
    }
  }

  //Confirms session creation to validated clients
  confirmSession() {
    this.players = this.players.filter(player => {
      return player.sessionValidated;
    });
    this.players.forEach(player => {
      const playersData = this.players.map(player => {
        return {
          playerId: player.internalId,
          avatarId: player.sessionAvatar.id,
          nick: player.sessionNick
        }
      });
      const sessionData = this.buildMessage(SESSION_SC_COMM_CREATED, {
        sessionToken: this.sessionToken.token,
        playerToken: player.token,
        playersData: playersData
      });
      webSocketSend(player, sessionData, this.handleDisconnect);
    });
    this.playersValidated = true;
  }

  //Starts game session sudden death time (activates when a player finish)
  startFinishCounter() {
    this.players.forEach(player => {
      webSocketSend(player, { remainingTime: SESSION_FINISH_TIMER }, this.handleDisconnect);
    });

    this.endingCounter = setTimeout(() => {
      this.endSession();
    }, SESSION_FINISH_TIMER);
  }

  //Checks if all players in session have finished
  checkEndingCondition() {
    const finishedPlayers = this.players.filter(player => {
      return player.hasFinished();
    }).length;

    if(finishedPlayers == this.players.length) {
      this.endSession();
    }
  }

  //Game session sucessful ending, sends last results and terminates the game.
  endSession() {
    if(this.endingCounter) {
      clearTimeout(this.endingCounter);
    }
    clearInterval(this.gameLoopInterval);

    const finalTable = this.players.map(player => {
      return {
        playerId: player.internalId,
        status: player.sessionState.state == PLAYER_STATE_FINISHED ?
          PLAYER_FINISH_STATE_COMPLETED : PLAYER_FINISH_STATE_NOT_COMPLETED,
        time: player.getGameTime()
      }
    });

    this.players.forEach(player => {
      webSocketSend(player, finalTable, this.handleDisconnect);
    });

    this.abortStarted = true;
    process.send(this.buildMessage(SESSION_MSG_TYPE_END));

    setTimeout(() => {
      webSocketTerminate(this.publisher);
      process.exit(0);
    }, SESSION_POST_ABORT_PROCESS_TTL);
  }
}

new SessionProccess();
