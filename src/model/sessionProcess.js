// @utilities
const {
  createPublisher,
  sendAbortData,
  sendSessionData,
  sendStartData
} = require('../utilities');

// @Constants
const {
  SESSION_MSG_TYPE_ABORT,
  SESSION_MSG_CLIENT_LOAD_FINISHED,
  SESSION_MSG_TYPE_CREATE,
  SESSION_MSG_TYPE_END,
  SESSION_MSG_TYPE_ERR,
  SESSION_MSG_TYPE_INIT_SUCCESS,
  SESSION_MSG_TYPE_INFO,
  SESSION_MSG_TYPE_INIT_SENT,
  SESSION_MSG_TYPE_CREATED,
  SESSION_MSG_TYPE_START,
  SESSION_TYPE_UDP_UPDATE,
  SESSION_TYPE_UDP_ACK,
  SESSION_TYPE_UDP_LOAD_FINISH,
  SERVER_MIN_GAME_PLAYERS
} = require('../constants');

class SessionProccess {
  constructor() {
    this.readyPlayers = [];
    this.seqNumber = 1;

    this.initSession = this.initSession.bind(this);
    this.abortSession = this.abortSession.bind(this);
    this.startSession = this.startSession.bind(this);
    this.validateSession = this.validateSession.bind(this);
    this.handlePublisherIncomingData = this.handlePublisherIncomingData.bind(this);
    this.buildMessage = this.buildMessage.bind(this);

    //Forked session process reducer
    process.on('message', data => {
      switch (data.type) {
        case SESSION_MSG_TYPE_CREATE:
          this.initSession(data.payload);
          break;
        case SESSION_MSG_TYPE_ABORT:
          this.abortSession(data.payload);
          break;
        case SESSION_MSG_TYPE_START:
          this.startSession(data.payload);
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
        this.publisher = pub.pub;
        const port = pub.port;

        process.send(this.buildMessage(SESSION_MSG_TYPE_CREATED, port));
        this.validateSession(data.players, data.levelId, data.token, port);
        process.send(this.buildMessage(SESSION_MSG_TYPE_INIT_SENT));

        this.publisher.on('message', (message, remote) => {
          const data = JSON.parse(message);
          this.handlePublisherIncomingData(data);
        });
      }
    });
  }

  //Aborts a recently started session
  abortSession(playersData){
    playersData.forEach(player => {
      sendAbortData(player.sessionIp, player.sessionPort);
    });
    setTimeout(() => {
      this.process.exit(0);
    }, 5000);
  }

  //Sends the start time with sincronization time and starts game update progress
  startSession(payload) {
    payload.players.forEach(player => {
      sendStartData(player.sessionIp, player.sessionPort, payload.startTime);
    });

    this.level = payload.level;
    this.readyPlayers = payload.players;
    this.sessionToken = payload.sessionToken;
    //this.readyPlayers.forEach(player => {
    //  player.updateSessionState(this.level.startingPosX, this.level.startingPosY, this.level.startingDirectionId);
    //});
    setTimeout(() => {
      this.gameLoop();
    }, 5000);
  }

  //Produces de game loop
  gameLoop() {
    this.gameLoop = setInterval(() => {
      const players = this.readyPlayers.map(player => {
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
      this.readyPlayers.forEach(player => {
        const playersData = {
          sessionToken: this.sessionToken.token,
          seqNumber: this.seqNumber,
          players: players
        };
        const message = new Buffer(JSON.stringify(this.buildMessage(SESSION_TYPE_UDP_UPDATE, playersData)));
        this.publisher.send(message, 0, message.length, player.sessionPort, player.sessionIp, (err, bytes) => {

        });
      });
      this.seqNumber += 1;
    }, 40);
  }

  //Sends session data to players and waits for players subscription to pubber
  validateSession(players, levelId, token, port){
    console.log("catran");
    if(players.length >= SERVER_MIN_GAME_PLAYERS && port && token && levelId) {
      const playersData = players.map(playerData => {
        return {
          playerId: playerData.internalId,
          avatarId: playerData.sessionAvatar.id,
          nick: playerData.sessionNick
        }
      });
      players.forEach(player => {
        sendSessionData(player.sessionIp, player.sessionPort, {
          sessionToken: token,
          playerToken: player.token,
          sessionPort: port,
          playersData: playersData.filter(playerData => {
            return playerData.playerId != player.internalId;
          })
        });
      });
    };
  }


  //Handles session incoming data
  handlePublisherIncomingData(data){
    switch(data.type){
      case SESSION_TYPE_UDP_ACK:
        process.send(this.buildMessage(SESSION_MSG_TYPE_INIT_SUCCESS, data.payload));
        break;
      case SESSION_TYPE_UDP_LOAD_FINISH:
        process.send(this.buildMessage(SESSION_MSG_CLIENT_LOAD_FINISHED, data.payload));
        break;
      default:
        break;
    }
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
