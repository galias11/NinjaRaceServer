// @Vendor
const getPort = require('getport') //@getport npm MIT licence
const sntp = require('sntp') //@sntp npm BSD-3-Clause
const WebSocket = require('ws'); //@ws npm MIT license

// @Utilities

// @constants
const {
    //NTP_ARGENTINA_POOL,
    NTP_PORT,
    NTP_REQUEST_TIMEOUT,
    NTP_RESOLVE_REFERENCE,
    SERVER_MIN_AVAILABLE_PORT,
    SERVER_MAX_AVAILABLE_PORT,
    webSocketPerMessageDeflateParams
} = require('../constants');

//Creates a publisher for a game session.
const createPublisher = callback => {
    getPort(SERVER_MIN_AVAILABLE_PORT, SERVER_MAX_AVAILABLE_PORT, (err, port) => {
        if(err) {
            callback(true);
        } else {
            const wss = new WebSocket.Server({
                port: port,
                perMessageDeflate: webSocketPerMessageDeflateParams
            });
            callback(undefined, {
                pub: wss,
                port: port
            });
        }
    });
};

const webSocketSend = (player, payload, errorListener) => {
    const sendData = JSON.stringify(payload);
    if(player.sessionSocket){
        try { player.sessionSocket.send(sendData); }
        catch(err) { errorListener(player) }
    }
};

const webSocketTerminate = webSocket => {
    webSocket.clients.forEach(client => {
        client.close();
    })
};

const checkWebSocketConn = webSocket => {
    return webSocket && webSocket.readyState === webSocket.OPEN
}

const getNTPTime = (callback) => {
    const options = {
    //host: NTP_ARGENTINA_POOL,
        port: NTP_PORT,
        resolveReference: NTP_RESOLVE_REFERENCE,
        timeout: NTP_REQUEST_TIMEOUT
    };

    const exec = async function () {
        try {
            const time = await sntp.time(options);
            const localTime = new Date()
            const ntpTime = localTime.getTime() + time.t;
            callback({error: false, ntpTime: ntpTime});
        }
        catch (err) {
            console.log(err);
            callback({error: true});
        }
    };

    exec();
};

module.exports = {
    checkWebSocketConn,
    createPublisher,
    getNTPTime,
    webSocketSend,
    webSocketTerminate
}
