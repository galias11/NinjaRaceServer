// @Utilities
const {
  buildMessage,
  checkWebSocketConn,
  findPlayerById,
  getNTPTime,
  logger,
  schemas,
  validateData,
  validateToken,
  webSocketSend,
  webSocketTerminate
} = require('../utilities');

// @Constants
const {
  PLAYER_FINISH_STATE_COMPLETED,
  PLAYER_FINISH_STATE_NOT_COMPLETED,
  PLAYER_STATE_FINISHED,
  PLAYER_STATE_INIT,
  SESSION_AFTER_FIRST_LOAD_VALIDATION_TIME,
  SESSION_CONNECTION_VALIDATION_TIME,
  SESSION_FINISH_TIMER,
  SESSION_MIN_GAME_PLAYERS,
  SESSION_POST_ABORT_PROCESS_TTL,
  SESSION_SC_COMM_END,
  SESSION_SC_COMM_START_SYNC,
  SESSION_SC_COMM_UPDATE,
  SESSION_STATE_INITIALIZED,
  SESSION_STATE_VALIDATED,
  SESSION_STATE_SYNCHRONIZING,
  SESSION_STATE_STARTED,
  SESSION_STATE_FINISHED,
  SESSION_STATE_ABORT,
  SESSION_SYNC_START_EMMITING_OFFSET,
  SESSION_SYNC_START_OFFSET,
  SESSION_UPDATE_RATE
} = require('../constants');

class SessionState {
  constructor(session, validationCounterTime, stateId) {
    this.session = session;
    this.validationCounterTime = validationCounterTime ? validationCounterTime : 1;
    this.validationStarted = false;
    this.stateId = stateId;

    this.session.notifyState(this.stateId);

    this.initValidationCounter = this.initValidationCounter.bind(this);
    this.stateTransition = this.stateTransition.bind(this);
    this.handleIncomingData = this.handleIncomingData. bind(this);
    this.act = this.act.bind(this);

    this.act();
  }

  //Sets and inits the state validation counter
  initValidationCounter() {
    setTimeout(() => {
      this.stateTransition();
    }, this.validationCounterTime)
  }

  //Determines which will be the next state and sets it
  stateTransition() {

  }

  //Handles incoming data from client
  handleIncomingData() {

  }

  //Determines session action for the current state
  act() {

  }
}

class InitializedState extends SessionState {

  constructor(session) {
    super(session, SESSION_CONNECTION_VALIDATION_TIME, SESSION_STATE_INITIALIZED);
  }

  stateTransition(){
    this.validationStarted = true;
    this.session.players = this.session.players.filter(player => {
      if(!player.sessionValidated && checkWebSocketConn(player.sessionSocket)) {
        player.sessionSocket.close();
      }
      return player.sessionValidated && checkWebSocketConn(player.sessionSocket);
    });

    const validatedPlayers = this.session.players.length;

    if(validatedPlayers >= SESSION_MIN_GAME_PLAYERS) {
      this.session.setState(new ValidatedState(this.session));
    } else {
      this.session.setState(new AbortState(this.session));
    }
  }

  handleIncomingData(incomingData, connection) {
    if(!this.validationStarted && validateData(incomingData, schemas.sessionConnValidationSchema)) {
      const validationData = incomingData.payload;
      const sessionToken = validationData.sessionToken;
      const playerId = validationData.playerId;
      //const playerToken = validationData.playerToken;
      if(validateToken(sessionToken, this.session.sessionToken.secret)) {
        const player = findPlayerById(playerId, this.session.players);
        //TODO: uncomment when it is not a mock test
        if(player && !player.sessionValidated /*&& player.validate(playerToken)*/) {
          player.sessionSocket = connection;
          player.sessionValidated = true;
          logger(`player ${player.internalId} validated on session ${this.session.id}`);
        }
      }
    }
  }

  act() {
    this.initValidationCounter();
  }
}

class ValidatedState extends SessionState {

  constructor(session) {
    super(session, SESSION_AFTER_FIRST_LOAD_VALIDATION_TIME, SESSION_STATE_VALIDATED);
  }

  stateTransition() {
    this.validationStarted = true;

    this.session.players = this.session.players.filter(player => {
      if(!player.sessionReady && checkWebSocketConn(player.sessionSocket)) {
        player.sessionSocket.close();
      }
      return player.sessionReady && checkWebSocketConn(player.sessionSocket);
    });

    const readyPlayers = this.session.players.length;

    if(readyPlayers >= SESSION_MIN_GAME_PLAYERS) {
      this.session.setState(new SynchronizingState(this.session));
    } else {
      this.session.setState(new AbortState(this.session));
    }
  }

  handleIncomingData(incomingData) {
    if(validateData(incomingData, schemas.sessionLoadFinishSchema)) {
      const playerId = incomingData.payload.playerId;
      const player = findPlayerById(playerId, this.session.players);
      if(player) {
        if(!this.validationStarted) {
          this.validationStarted = true;
          this.initValidationCounter();
        }
        player.sessionReady = true;
        logger(`player ${player.internalId} ready to start on session ${this.session.id}`);
      }
    }
  }
}

class SynchronizingState extends SessionState {

  constructor(session, ) {
    super(session, SESSION_SYNC_START_EMMITING_OFFSET, SESSION_STATE_SYNCHRONIZING);

    this.ntpError = false;
  }

  stateTransition() {
    if(this.ntpError) {
      this.session.setState(new AbortState(this.session));
    } else {
      this.session.setState(new PlayingState(this.session))
    }
  }

  act() {
    getNTPTime((reply) => {
      if(reply.error) {
        this.ntpError = true;
      } else {
        const ntpStartTime = reply.ntpTime + SESSION_SYNC_START_OFFSET;
        const level = this.session.level;
        this.session.players.forEach(player => {
          const payload = {
            type: SESSION_SC_COMM_START_SYNC,
            timeStamp: ntpStartTime
          };

          player.updateSessionState(level.startingPosX, level.startingPosY,
                                    level.startingDirectionId, PLAYER_STATE_INIT);

          webSocketSend(player, payload, this.session.handleDisconnect);
        });
      }
      this.initValidationCounter();
    })
  }
}

class PlayingState extends SessionState {

  constructor(session) {
    super(session, SESSION_FINISH_TIMER, SESSION_STATE_STARTED);

  }

  initValidationCounter() {
    this.validationStarted = true;
    this.validationCounter = setTimeout(() => {
      this.stateTransition();
    }, this.validationCounterTime);
  }

  stateTransition() {
    if(this.validationCounter) {
      clearTimeout(this.validationCounter);
    }
    this.session.setState(new FinishedState(this.session));
  }

  handleIncomingData(incomingData) {
    if(validateData(incomingData, schemas.sessionPlayerUpdateSchema)) {
      const playerData = incomingData.payload;
      const player = findPlayerById(playerData.playerId, this.session.players);

      if(player) {
        player.updateSessionState(playerData.position.x, playerData.position.y,
                                  playerData.directionId, playerData.state);

        if(playerData.state == PLAYER_STATE_FINISHED) {
          if(!this.validationStarted) {
            this.validationStarted = true;
            this.initValidationCounter();
          }

          if(this.session.checkEndingCondition()) {
            this.stateTransition();
          }
        }
      }
    }
  }

  act() {
    this.session.setGameLoopInterval(setInterval(() => {
      const players = this.session.players.map(player => {
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

      this.session.players.forEach(player => {
        if(player.sessionReady && player.sessionConnected) {
          const data = {
            players: players
          };
          const updateData = buildMessage(SESSION_SC_COMM_UPDATE, data);
          webSocketSend(player, updateData, this.session.handleDisconnect);
        }
      });
    }, SESSION_UPDATE_RATE));
  }
}

class FinishedState extends SessionState {

  constructor(session) {
    super(session, SESSION_POST_ABORT_PROCESS_TTL, SESSION_STATE_FINISHED);

  }

  stateTransition() {
    webSocketTerminate(this.session.publisher);
    process.exit(0);
  }

  act() {
    this.session.clearGameLoopInterval();
    
    const finalTable = this.session.players.map(player => {
      return {
        playerId: player.internalId,
        status: player.sessionState.state == PLAYER_STATE_FINISHED ?
          PLAYER_FINISH_STATE_COMPLETED : PLAYER_FINISH_STATE_NOT_COMPLETED,
        time: player.getGameTime()
      }
    });

    this.session.players.forEach(player => {
      webSocketSend(player, finalTable, this.handleDisconnect);
    });

    this.initValidationCounter();
  }
}

class AbortState extends SessionState {

  constructor(session) {
    super(session, SESSION_POST_ABORT_PROCESS_TTL, SESSION_STATE_ABORT);
  }

  stateTransition() {
    webSocketTerminate(this.session.publisher);
    process.exit(0);
  }

  act() {
    this.session.players.forEach(player => {
      if(player.sessionValidated && player.sessionConnected) {
        const abortData = {
          type: SESSION_SC_COMM_END
        };
        webSocketSend(player, abortData, this.handleDisconnect);
      }
    });

    this.initValidationCounter();
  }
}

module.exports = {
  InitializedState,
  ValidatedState,
  SynchronizingState,
  PlayingState,
  FinishedState,
  AbortState
}
