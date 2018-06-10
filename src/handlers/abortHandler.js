// @Routes
const routes = require('../routes');

// @Utilities
const {
    logger,
    schemas,
    validateData
} = require('../utilities');

//handles request aborts
const handleAbort = (request) => {
    const route = request.path;
    logger(`request with path ${route} was interrupted, handling abort`);
    switch (route) {
        case routes.JOIN_QUEUE_REQUEST:
            if(request.auth.isAuthenticated) {
                if(validateData(request.payload, schemas.joinQueueRequestSchema)) {
                    const session = request.auth.credentials;
                    const playerId = session.playerId;
                    const levelId = request.payload.levelId;
                    request.server.methods.abortJoinQueue(playerId, levelId);
                }
            }
            break;
        default:
            break;
    }
}

module.exports = {
    handleAbort
}
