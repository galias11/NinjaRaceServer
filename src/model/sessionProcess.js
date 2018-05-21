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
  SESSION_TYPE_UDP_ACK,
  SESSION_TYPE_UDP_LOAD_FINISH,
  SERVER_MIN_GAME_PLAYERS
} = require('../constants');

//Foked session process reducer
process.on('message', data => {

  switch (data.type) {
    case SESSION_MSG_TYPE_CREATE:
      initSession(data.payload);
      break;
    case SESSION_MSG_TYPE_ABORT:
      abortSession(data.payload);
      break;
    case SESSION_MSG_TYPE_START:
      startSession(data.payload);
    default:
      break;
  }

});

//Initializes session publisher
const initSession = (data) => {
  createPublisher((err, pub) => {
    if(err) {
      process.send({
        type: SESSION_MSG_TYPE_ERR,
        payload: `game session error while creating`
      })
    } else {
      const publisher = pub.pub;
      const port = pub.port;

      process.send(buildMessage(SESSION_MSG_TYPE_CREATED, port));
      validateSession(data.players, data.levelId, data.token, port);
      process.send(buildMessage(SESSION_MSG_TYPE_INIT_SENT));

      publisher.on('message', (message, remote) => {
        const data = JSON.parse(message);
        handlePublisherIncomingData(data);
      });
    }
  })
}

//Aborts a recently started session
const abortSession = (playersData) => {
  playersData.forEach(player => {
    sendAbortData(player.sessionIp, player.sessionPort);
  });
  setTimeout(() => {
    process.exit(0);
  }, 5000);
}

//Sends the start time with sincronization time
const startSession = (payload) => {
  payload.players.forEach(player => {
    sendStartData(player.sessionIp, player.sessionPort, payload.startTime);
  });
}

//Sends session data to players and waits for players subscription to pubber
const validateSession = (players, levelId, token, port) => {
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
const handlePublisherIncomingData = data => {
  switch(data.type){
    case SESSION_TYPE_UDP_ACK:
      process.send(buildMessage(SESSION_MSG_TYPE_INIT_SUCCESS, data.payload));
      break;
    case SESSION_TYPE_UDP_LOAD_FINISH:
      process.send(buildMessage(SESSION_MSG_CLIENT_LOAD_FINISHED, data.payload));
      break;
    default:
      break;
  }
}

//builds a message for parent process
const buildMessage = (type, payload) => {
  return {
    type,
    payload: payload
  }
}
