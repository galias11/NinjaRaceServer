// @Vendor
const net = require('net');
const dgram = require('dgram');
const getPort = require('get-port') //@get-port npm MIT licence
const sntp = require('sntp') //@sntp npm BSD-3-Clause
const WebSocket = require('ws'); //@ws npm MIT license

// @Utilities
const { logger } = require('./logginUtilities');
const { generateToken, validateToken } = require('./encryptUtilities');

// @constants
const {
  NTP_ARGENTINA_POOL,
  NTP_PORT,
  NTP_REQUEST_TIMEOUT,
  NTP_RESOLVE_REFERENCE,
  SERVER_MAIN_IP,
  webSocketPerMessageDeflateParams
} = require('../constants');

//Creates a publisher for a game session.
const createPublisher = callback => {
  const port = getPort()
    .then(port => {
      const wss = new WebSocket.Server({
        port: port,
        perMessageDeflate: webSocketPerMessageDeflateParams
      });
      callback(undefined, {
        pub: wss,
        port: port
      });

    }).catch((err) => {
      callback(true);
    });
};

const webSocketSend = (player, payload, errorListener) => {
  const sendData = JSON.stringify(payload);
  if(player.sessionSocket){
    try { player.sessionSocket.send(sendData); }
    catch(err) { errorListener(player) };
  }
};

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
  createPublisher,
  getNTPTime,
  webSocketSend
}
