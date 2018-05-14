// @Vendor
const net = require('net');

// @Utilities
const { logger } = require('./logginUtilities');

const validateSessionPort = (ip, port, callback) => {
  const client = new net.Socket();
  logger(`testing connection to temporal session al ${ip}:${port}`);

  client.connect(port, ip, function() {
  	logger(`connection established to ${ip}:${port}`);
  	client.write('echo');
  });

  client.on('data', data => {
  	logger(`reply from ${ip}:${port}`);
    callback(data);
  	client.destroy();
  });
}

module.exports = {
  validateSessionPort
}
