const originServiceConstants = {
  SERVER_SERVICE_CRO: 'cross',
  SERVER_SERVICE_LOG: 'login',
  SERVER_SERVICE_REG: 'register',
  SERVER_SERVICE_LDAT: 'levelDataRequest',
  SERVER_SERVICE_DLG: 'logout',
  SERVER_SERVICE_JQR: 'joinQueueRequest',
  SERVER_SERVICE_LQR: 'leaveQueueRequest'
}

const repliesConstants = {
  SERVER_REPLY_CRO01: 'CRO01',
  SERVER_REPLY_CRO02: 'CRO02',
  SERVER_REPLY_CRO03: 'CRO03',
  SERVER_REPLY_CRO04: 'CRO04',
  SERVER_REPLY_DLG01: 'DLG01',
  SERVER_REPLY_JQR01: 'JQR01',
  SERVER_REPLY_JQR02: 'JQR02',
  SERVER_REPLY_JQR03: 'JQR03',
  SERVER_REPLY_LDAT01: 'LDAT01',
  SERVER_REPLY_LOG01: 'LOG01',
  SERVER_REPLY_LOG02: 'LOG02',
  SERVER_REPLY_LOG03: 'LOG03',
  SERVER_REPLY_LQR01: 'LQR01',
  SERVER_REPLY_REG01: 'REG01',
  SERVER_REPLY_REG02: 'REG02',
  SERVER_REPLY_UNK_CODE: 'UNK'
};

const replyText = {
  SERVER_REPLY_ERR01: 'Bad request',
  SERVER_REPLY_ERR02: 'Not found',
  SERVER_REPLY_ERR03: 'Already online',
  SERVER_REPLY_ERR04: 'User not exists or incorrect password',
  SERVER_REPLY_ERR05: 'Player already exists',
  SERVER_REPLY_ERR06: 'Failed to retrieve data',
  SERVER_REPLY_ERR07: 'Player not logged in',
  SERVER_REPLY_ERR08: 'Cant\'t validate session port',
  SERVER_REPLY_ERR09: 'Player already waiting in queue',
  SERVER_REPLY_UNK_TEXT: 'Internal error'
}

module.exports = {...originServiceConstants, ...repliesConstants, ...replyText};
