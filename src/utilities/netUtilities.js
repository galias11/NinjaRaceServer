// @Vendor
const net = require('net');
const dgram = require('dgram');
const getPort = require('get-port') //@get-port MIT licence
const sntp = require('sntp') //@sntp BSD-3-Clause

// @Utilities
const { logger } = require('./logginUtilities');
const { generateToken, validateToken } = require('./encryptUtilities');

// @constants
const {
  sessionPorts,
  SERVER_MAIN_IP,
  SESSION_TYPE_UDP_END,
  SESSION_TYPE_UDP_CHECK_PORT,
  SESSION_TYPE_UDP_CREATED,
  SESSION_TYPE_UDP_START,
  SESSION_TYPE_UDP_UPDATE,
  ARGENTINA_NTP_POOL
} = require('../constants');

//Creates a UDP message
const udpMessage = (type, payload) => {
  return new Buffer(JSON.stringify({
    type: type,
    payload
  }));
}

//Validates if a UTP port is actually listening
function validateSessionPortUDP(ip, port, callback) {
  const client = dgram.createSocket('udp4');
  const token = generateToken();
  logger(`testing connection to temporal session to ${ip}:${port}`);
  const message = udpMessage(SESSION_TYPE_UDP_CHECK_PORT, {token: token.token});

  client.send(message, 0, message.length, port, ip, (err, bytes) => {
    if(err) {
      callback({
        error: true
      });
    } else{
      logger(`validation data sent to ${ip}:${port}`);
    }
  });

  client.on('message', (data, remote) => {
    logger(`reply from ${remote.address}:${remote.port}`);
    const payload = JSON.parse(data);
    if(!validateToken(payload.token, token.secret)) {
      callback({
        error: false,
        payload: reply
      });
    } else {
      callback({
        payload: {
          email: payload.email,
          playerId: payload.playerId
        }
      });
    }
    client.close();
  });
}

//Sends session data to the requested destination
const sendSessionData = (ip, port, sessionData) => {
  const client = dgram.createSocket('udp4');
  const message = udpMessage(SESSION_TYPE_UDP_CREATED, sessionData);

  client.send(message, 0, message.length, port, ip, (err, bytes) => {
  	if(err) {
      logger(`error while sending session data to ${ip}:${port}`);
    }
    logger(`sent session data (${bytes}b) to ${ip}:${port}`);
    client.close();
  });
}

//Sends session data to the requested destination
const sendAbortData = (ip, port) => {
  const client = dgram.createSocket('udp4');
  const message = udpMessage(SESSION_TYPE_UDP_END);

  client.send(message, 0, message.length, port, ip, (err, bytes) => {
    if(err) {
      logger(`error while sending abort data to ${ip}:${port}`);
    }
    logger(`sent abort data (${bytes}b) to ${ip}:${port}`);
    client.close();
  });
}

//Sends start data to the requested destination
const sendStartData = (ip, port, time) => {
  const client = dgram.createSocket('udp4');
  const message = udpMessage(SESSION_TYPE_UDP_START, time);

  client.send(message, 0, message.length, port, ip, (err, bytes) => {
    if(err) {
      logger(`error while sending sync data to ${ip}:${port}`);
    }
    logger(`sent sync data (${bytes}b) to ${ip}:${port}`);
    client.close();
  })
}

//Creates a publisher for a game session.
const createPublisher = callback => {
  const pub = dgram.createSocket('udp4');

  const port = getPort()
    .then(port => {
      pub.bind(port, SERVER_MAIN_IP);
      callback(undefined, {
        pub: pub,
        port: port
      });
    }).catch(() => {
      callback(true);
    });
}

const getNTPTime = (callback) => {
  const options = {
    host: ARGENTINA_NTP_POOL,
    port: 123,
    resolveReference: true,
    timeout: 2000
  };

  const exec = async function () {
    try {
      const time = await sntp.time(options);
      const localTime = new Date()
      const ntpTime = localTime.getTime() + time.t;
      callback({error: false, ntpTime: ntpTime});
    }
    catch (err) {
      callback({error: true});
    }
  };

  exec();
}

module.exports = {
  createPublisher,
  getNTPTime,
  sendAbortData,
  sendSessionData,
  sendStartData,
  validateSessionPortUDP
}
