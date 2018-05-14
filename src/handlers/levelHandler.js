// @Utilities
const {
  buildAuthenticationReply,
  buildBadRequestReply,
  buildReply,
  logger
} = require('../utilities');

const {
  SERVER_SERVICE_CRO
} = require('../constants');

//Handles a level data request.
async function handleLevelDataRequest(request, h) {
  logger(`levelDataRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

  let response;
  if(!request.auth.isAuthenticated){
    response = h.response(buildAuthenticationReply());
  } else {
    const session = request.auth.credentials;
    response = h.response(buildReply(request.server.methods.getLevelData(request.query.levelId)));
    response.type('aplication/JSON');
  }

  return response;
}

//Inserts a player into a waiting queue for a game session
async function handleQueueJoinRequest(request, h) {
  logger(`joinQueueRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

  let response;
  if(!request.auth.isAuthenticated){
    response = h.response(buildAuthenticationReply());
  } else {
    if(!request.payload || !request.payload.levelId || !request.payload.avatarId || !request.payload.nick || !request.payload.sessionPort) {
      response = h.response(buildBadRequestReply());
    } else {
      const sessionPort = request.payload.sessionPort;
      const sessionIp = request.info.remoteAddress;
      const session = request.auth.credentials;
      const playerId = session.playerId;
      const levelId = request.payload.levelId;
      const avatarId = request.payload.avatarId;
      const nick = request.payload.nick;

      response = await new Promise((resolve, reject) => {
        request.server.methods.joinQueue(levelId, playerId, avatarId, nick, sessionIp, sessionPort, reply => {
          resolve(reply);
        })
      }).then(reply => {
        return h.response(buildReply(reply));
      }).catch(() => {
        return h.response(buildFailureReply());
      })
    }
  }
  return response;
}

//Removes a player from a waiting queue for a game session
async function handleQueueLeaveRequest(request, h){
  logger(`leaveQueueRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

  let response;
  if(!request.auth.isAuthenticated){
    response = h.response(buildAuthenticationReply());
  } else {
    if(!request.payload || !request.payload.queueId){
      response = h.reponse(buildBadRequestReply());
    } else {
      const session = request.auth.credentials;
      const queueId = request.payload.queueId;
      const playerId = session.playerId;

      response = await new Promise((resolve, reject) => {
        request.server.methods.leaveQueue(playerId, queueId, reply => {
          resolve(reply);
        })
      }).then(reply => {
        return h.response(buildReply(reply));
      }).catch(() => {
        return h.response(buildFailureReply());
      })
    }
  }

  return response;
}

module.exports = {
  handleLevelDataRequest,
  handleQueueJoinRequest,
  handleQueueLeaveRequest
}
