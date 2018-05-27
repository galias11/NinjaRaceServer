// --> Constants index

// @replies
const repliesConstants = require('./replies');

// @communication
const commConstants = require('./commConstants');

// @parameters
const parameters = require('./parameters');

const serverConstants = {
  PLAYER_STATE_DISCONNECTED: 'D',
  PLAYER_STATE_FINISHED: 'F',
  PLAYER_STATE_INIT: 'I',
  PLAYER_STATE_PLAYING: 'P',
  PLAYER_FINISH_STATE_COMPLETED: 'C',
  PLAYER_FINISH_STATE_NOT_COMPLETED: 'U',
  SERVER_COOKIE_TTL: 15*24*60*60*1000, //15 days
  SERVER_CRYPT_SALT: 10,
  SERVER_DATE_STD_ADJUST: 3*60*60*1000, //timestamp adjusting --> 3 hours
  SERVER_MAIN_HOST: undefined,
  SERVER_MAIN_METHOD_GET: 'GET',
  SERVER_MAIN_METHOD_POST: 'POST',
  SERVER_MAIN_PORT: 8080,
  SERVER_MAIN_IP: '192.168.0.106',
  SERVER_DB_QUOTED_TYPE: 'QT',
  SERVER_DB_NON_QUOTED_TYPE: 'NQT',
  SERVER_TABLE_LEVELS: 'levels',
  SERVER_TABLE_PLAYER: 'players',
  SERVER_TABLE_AVATAR: 'avatars',
  TOKEN_REGEX: /^[A-Za-z0-9-]+$/
}

module.exports = {
  ...commConstants,
  ...parameters,
  ...repliesConstants,
  ...serverConstants
};
