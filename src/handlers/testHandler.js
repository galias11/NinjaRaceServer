// @Constants
const {
    testCodes
} = require('../constants');

// @Utilities
const {
    buildBadRequestReply,
    buildFailureReply,
    buildTestRequestSuccessReply,
    dbEnviromentSetup,
    logger
} = require('../utilities');

// @Environment data
const {
    dbEnvironment,
    svEnvironment
} = require('../test');

//Handles a server environment set up request
async function handleEnvironmentSetup(request, h) {
    logger(`Test environment setup request recerived from: ${request.info.remoteAddress}:${request.info.remotePort}`);

    let reply;
    let success;

    if(request.payload && request.payload.code) {
        const code = request.payload.code;

        switch(code) {
            case testCodes.A_01:
                request.server.methods.testMockLevels(svEnvironment.SVA_01);
                success = true;
                break;
            case testCodes.A_02:
                request.server.methods.testMockLevels(svEnvironment.SVA_02);
                success = true;
                break; 
            case testCodes.A_03:
                request.server.methods.testMockLevels(svEnvironment.SVA_03);
                success = true;
                break;
            case testCodes.F_01:
                request.server.methods.testMockPlayers(svEnvironment.SVF_01);
                success = await dbEnviromentSetup(dbEnvironment.DBF_01);
                break;
            case testCodes.F_02:
                request.server.methods.testMockPlayers(svEnvironment.SVF_02);
                success = await dbEnviromentSetup(dbEnvironment.DBF_03);
                break;
            case testCodes.F_03:
                request.server.methods.testMockPlayers(svEnvironment.SVF_02);
                success = await dbEnviromentSetup(dbEnvironment.DBF_02);
                break;
            case testCodes.F_04:
                break;
            case testCodes.F_05:
                request.server.methods.testMockPlayers(svEnvironment.SVF_03);
                success = await dbEnviromentSetup(dbEnvironment.DBF_01);
                break;
            case testCodes.F_06:
                request.server.methods.testMockPlayers(svEnvironment.SVF_04);
                success = await dbEnviromentSetup(dbEnvironment.DBF_03);
                break;
            case testCodes.G_01:
                request.server.methods.testMockPlayers(svEnvironment.SVG_01);
                success = true;
                break;
            case testCodes.G_02:
                request.server.methods.testMockPlayers(svEnvironment.SVG_02);
                success = true;
                break;
            case testCodes.G_03:
                request.server.methods.testMockPlayers(svEnvironment.SVG_03);
                success = true;
                break;
            case testCodes.H_01:
                success = await dbEnviromentSetup(dbEnvironment.DBH_01);
                break;
            case testCodes.H_02:
                success = await dbEnviromentSetup(dbEnvironment.DBH_02);
                break;
            case testCodes.H_03:
                success = await dbEnviromentSetup(dbEnvironment.DBH_03);
                break;
            case testCodes.SERVER_INIT:
                success = await dbEnviromentSetup(dbEnvironment.RESET);
                break;
            default:
                break;
        }

        if(success) {
            reply = buildTestRequestSuccessReply();
        } else {
            reply = buildFailureReply();
        }

    } else {
        reply = buildBadRequestReply();
    }

    return h.response(reply);
}

module.exports = {
    handleEnvironmentSetup
}