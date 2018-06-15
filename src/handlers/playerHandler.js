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


//Handles player register request
async function handleRegisterPlayerRequest(request, h) {
    logger(`registerRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

    let response;
    if(!validateData(request.payload, schemas.registerPlayerSchema)){
        response = buildBadRequestReply();
    }  else {
        const email = request.payload.email;
        const pword = request.payload.pword;
        response = await new Promise((resolve) => {
            request.server.methods.saveNewPlayer(email, pword, (reply) => {
                resolve(buildReply(reply));
            });
        }).then((response) => {
            return response;
        }).catch(() => {
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
    if(!validateData(request.payload, schemas.loginRequestSchema)){
        response = buildBadRequestReply();
    } else {
        const email = request.payload.email;
        const pword = request.payload.pword;

        response = await new Promise((resolve) => {
            request.server.methods.logPlayer(email, pword, (reply) => {
                resolve(reply);
            });
        }).then((reply) => {
            if(reply.payload){
                request.cookieAuth.set(reply.payload);
            }
            return buildReply(reply);
        }).catch(() => {
            return buildFailureReply();
        });
    }

    response = h.response(response);
    return response
}

//Handles a logout request
async function handleLogoutRequest(request, h) {
    logger(`logoutRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

    let response;
    if(!request.auth.isAuthenticated){
        response = buildAuthenticationReply();
    } else {
        const session = request.auth.credentials;
        request.cookieAuth.clear();
        response = await new Promise((resolve) => {
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

//Handles a player record register
async function handleRecordRegisterRequest(request, h) {
    logger(`registerRecordRequest received from: ${request.info.remoteAddress}:${request.info.remotePort}`);

    let response;
    if(!request.auth.isAuthenticated){
        response = buildAuthenticationReply();
    } else {
        if(!validateData(request.payload, schemas.registerRecordSchema)) {
            response = buildBadRequestReply();
        } else {
            const session = request.auth.credentials;
            const playerId = session.playerId;
            const levelId = request.payload.levelId;
            const time = request.payload.time;

            response = await new Promise((resolve) => {
                request.server.methods.registerRecord(playerId, levelId, time, reply => {
                    resolve(reply);
                });
            }).then(reply => {
                return buildReply(reply);
            }).catch(() => {
                return buildFailureReply();
            });
        }
    }

    response = h.response(response);
    return response;
}

module.exports = {
    handleLoginRequest,
    handleLogoutRequest,
    handleRecordRegisterRequest,
    handleRegisterPlayerRequest
}
