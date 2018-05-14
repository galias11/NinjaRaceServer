// @Utilities
const {
  buildAuthenticationReply,
  buildBadRequestReply,
  buildFailureReply,
  buildReply,
  logger
} = require('../utilities');


//Handles player register request
async function handleRegisterPlayerRequest(request, h) {
  logger(`registerRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);
  const errorObject = {
    error: true,
    exists: false,
    success: false
  }

  let response;
  if(!request.payload || !request.payload.email || !request.payload.pword){
    response = buildBadRequestReply();
  }  else {
    const email = request.payload.email;
    const pword = request.payload.pword;
    response = await new Promise((resolve, reject) => {
      request.server.methods.saveNewPlayer(email, pword, (reply) => {
        resolve(buildReply(reply));
      });
    }).then((response) => {
      return response;
    }).catch((err) => {
      return buildFailureReply();
    });
  }

  response = h.response(response);
  return response;
}

//Handles player login request.
async function handleLoginRequest(request, h) {
  logger(`loginRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

  let response;
  if(!request.payload || !request.payload.email || !request.payload.pword){
    response = buildBadRequestReply();
  } else {
    const email = request.payload.email;
    const pword = request.payload.pword;

    response = await new Promise((resolve, reject) => {
      request.server.methods.logPlayer(email, pword, (reply) => {
        resolve(reply);
      });
    }).then((reply) => {
      if(reply.payload){
        request.cookieAuth.set(reply.payload);
      }
      return buildReply(reply);
    }).catch((err) => {
      return buildFailureReply();
    });
  }

  reponse = h.response(response);
  return response
}

async function handleLogoutRequest(request, h) {
  logger(`logoutRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

  let response;
  if(!request.auth.isAuthenticated){
    response = buildAuthenticationReply();
  } else {
    const session = request.auth.credentials;
    request.cookieAuth.clear();
    response = await new Promise((resolve, reject) => {
      request.server.methods.dlgPlayer(session.playerId, reply => {
        resolve(reply);
      });
    }).then(reply => {
      return buildReply(reply);
    }).catch(() => {
      return buildFailureReply();
    });
  }

  response = h.response(response);
  return response;
}

module.exports = {
  handleLoginRequest,
  handleLogoutRequest,
  handleRegisterPlayerRequest
}
