// @Constants
const {
  SERVER_DATE_STD_ADJUST
} = require('../constants');

const logger = (message) => {
  const timeStamp = new Date(new Date() - (SERVER_DATE_STD_ADJUST)).toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '');
  console.log(`${timeStamp}: ${message}`);
}

module.exports = {
  logger
}
