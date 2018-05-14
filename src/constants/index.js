// --> Constants index

// @replies
const repliesConstants = require('./replies');

const serverConstants = {
  SERVER_COOKIE_TTL: 15*24*60*60*1000, //15 days
  SERVER_CRYPT_SALT: 10,
  SERVER_DATE_STD_ADJUST: 3*60*60*1000, //timestamp adjusting --> 3 hours
  SERVER_MAIN_HOST: undefined,
  SERVER_MAIN_METHOD_GET: 'GET',
  SERVER_MAIN_METHOD_POST: 'POST',
  SERVER_MAIN_PORT: 8080,
  SERVER_DB_QUOTED_TYPE: 'QT',
  SERVER_DB_NON_QUOTED_TYPE: 'NQT',
  SERVER_TABLE_LEVELS: 'levels',
  SERVER_TABLE_PLAYER: 'players',
  SERVER_TABLE_AVATAR: 'avatars'
}

module.exports = {...serverConstants, ...repliesConstants };
