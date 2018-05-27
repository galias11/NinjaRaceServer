// @Utilities
const {
  buildAuthenticationReply,
  buildBadRequestReply,
  buildFailureReply,
  buildReply,
  logger,
  schemas,
  validateData
} = require('../utilities');

//Handles a level data request.
async function handleLevelDataRequest(request, h) {
  logger(`levelDataRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

  let response;
  if(!request.auth.isAuthenticated){
    response = h.response(buildAuthenticationReply());
  } else {
    if(!validateData(request.query, schemas.levelRequestSchema)){
      response = h.response(buildReply(request.server.methods.getLevelData(request.query.levelId)));
    } else {
      response = h.response(buildBadRequestReply());
    }
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
    if(!validateData(request.payload, schemas.joinQueueRequestSchema)) {
      response = h.response(buildBadRequestReply());
    } else {
      const session = request.auth.credentials;
      const playerId = session.playerId;
      const levelId = request.payload.levelId;
      const avatarId = request.payload.avatarId;
      const nick = request.payload.nick;

      response = await new Promise((resolve) => {
        request.server.methods.joinQueue(levelId, playerId, avatarId, nick, reply => {
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
    if(!validateData(request.payload, schemas.leaveQueueRequestSchema)){
      response = h.response(buildBadRequestReply());
    } else {
      const session = request.auth.credentials;
      const queueId = request.payload.queueId;
      const playerId = session.playerId;

      response = await new Promise((resolve) => {
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

async function handleSessionLeaveRequest(request, h) {
  logger(`leaveSessionRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

  let response;
  if(!request.auth.isAuthenticated){
    response = h.response(buildAuthenticationReply());
  } else {
    if(!validateData(request.payload, schemas.leaveQueueRequestSchema)) {
      response = h.reponse(buildBadRequestReply());
    } else {
      const session = request.auth.credentials;
      const playerId = session.playerId;
      const sessionId = request.payload.sessionId;

      response = await new Promise((resolve) => {
        request.server.methods.removePlayerFromSession(playerId, sessionId, replyData => {
          resolve(replyData);
        })
      }).then(replyData => {
        return h.response(buildReply(replyData));
      }).catch(() => {
        return h.response(buildFailureReply());
      });
    }

    return response;
  }
}

module.exports = {
  handleLevelDataRequest,
  handleQueueJoinRequest,
  handleQueueLeaveRequest,
  handleSessionLeaveRequest
}
