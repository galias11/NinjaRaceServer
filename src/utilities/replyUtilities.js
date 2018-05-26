// @Constants
const {
  SERVER_SERVICE_CRO,
  SERVER_SERVICE_LOG,
  SERVER_SERVICE_REG,
  SERVER_SERVICE_LDAT,
  SERVER_SERVICE_DLG,
  SERVER_SERVICE_JQR,
  SERVER_SERVICE_LQR,
  SERVER_SERVICE_GSP,
  SERVER_REPLY_CRO01,
  SERVER_REPLY_CRO02,
  SERVER_REPLY_CRO03,
  SERVER_REPLY_CRO04,
  SERVER_REPLY_LOG01,
  SERVER_REPLY_LOG02,
  SERVER_REPLY_REG01,
  SERVER_REPLY_JQR02,
  SERVER_REPLY_JQR03,
  SERVER_REPLY_UNK_CODE,
  SERVER_REPLY_ERR01,
  SERVER_REPLY_ERR02,
  SERVER_REPLY_ERR03,
  SERVER_REPLY_ERR04,
  SERVER_REPLY_ERR05,
  SERVER_REPLY_ERR06,
  SERVER_REPLY_ERR07,
  SERVER_REPLY_ERR08,
  SERVER_REPLY_ERR09,
  SERVER_REPLY_UNK_TEXT,
} = require('../constants');

const UNKNOWN = () => ({
  error: {
    code: SERVER_REPLY_UNK_CODE,
    text: SERVER_REPLY_UNK_TEXT
  }
});

const CRO01 = () => ({
  error: {
    code: SERVER_REPLY_CRO01,
    text: SERVER_REPLY_ERR01
  }
});

const CRO02 = () => ({
  error: {
    code: SERVER_REPLY_CRO02,
    text: SERVER_REPLY_ERR02
  }
});

const CRO03 = () => ({
  error: {
    code: SERVER_REPLY_CRO03,
    text: SERVER_REPLY_ERR06
  }
});

const CRO04 = () => ({
  error: {
    code: SERVER_REPLY_CRO04,
    text: SERVER_REPLY_ERR07
  }
});

const JQR01 = (sessionData) => ({
  payload: {
    success: true,
    sessionData
  }
});

const JQR02 = () => ({
  error: {
    code: SERVER_REPLY_JQR02,
    text: SERVER_REPLY_ERR08
  }
});

const JQR03 = () => ({
  error: {
    code: SERVER_REPLY_JQR03,
    error: SERVER_REPLY_ERR09
  }
})

const LOG01 = () => ({
  error: {
    code: SERVER_REPLY_LOG01,
    text: SERVER_REPLY_ERR03
  }
});

const LOG02 = () => ({
  error: {
    code: SERVER_REPLY_LOG02,
    text: SERVER_REPLY_ERR04
  }
})

const LOG03 = () => ({
  payload: {
    success: true
  }
});

const REG01 = () => ({
  error: {
    code: SERVER_REPLY_REG01,
    text: SERVER_REPLY_ERR05
  }
});

const REG02 = () => ({
  payload: {
    success: true
  }
});

const LDAT01 = (levelData) => ({
  payload: {
    success: true,
    levelData
  }
});

const DLG01 = () => ({
  payload: {
    success: true
  }
});

const LQR01 = () => ({
  payload: {
    success: true
  }
});

const GSP01 = () => ({
  payload: {
    success: true
  }
});

//Builds a reply
const buildReply = (reply) => {
  switch (reply.service) {
    case SERVER_SERVICE_CRO:
      switch(reply.code) {
        case 1:
          return CRO01();
        case 2:
          return CRO02();
        case 3:
          return CRO03();
        case 4:
          return CRO04();
        default:
          return UNKNOWN();
      }
    case SERVER_SERVICE_JQR:
      switch (reply.code) {
        case 1:
          return JQR01(reply.payload);
        case 2:
          return JQR02();
        case 3:
          return JQR03();
        default:
          return UNKNOWN();
      }
    case SERVER_SERVICE_LOG:
      switch (reply.code) {
        case 1:
          return LOG01();
        case 2:
          return LOG02();
        case 3:
          return LOG03();
        default:
          return UNKNOWN();
      }
    case SERVER_SERVICE_LQR:
      switch (reply.code) {
        case 1:
          return LQR01();
        default:
          return UNKNOWN();
      }
    case SERVER_SERVICE_REG:
      switch (reply.code) {
        case 1:
          return REG01();
        case 2:
          return REG02();
        default:
          return UNKNOWN();
      }
    case SERVER_SERVICE_LDAT:
      switch (reply.code) {
        case 1:
          return LDAT01(reply.payload);
        default:
          return UNKNOWN();
      }
    case SERVER_SERVICE_DLG:
      switch (reply.code) {
        case 1:
          return DLG01();
        default:
          return UNKNOWN();
      }
    case SERVER_SERVICE_GSP:
      switch (reply.code) {
        case 1:
          return GSP01();
        default:
          return UNKNOWN();
      }
    default:
      return UNKNOWN();
  }

}

const buildBadRequestReply = () => {
  return CRO01();
}

const buildAuthenticationReply = () => {
  return CRO04();
}

const buildFailureReply = () => {
  return CRO03();
}

module.exports = {
  buildAuthenticationReply,
  buildBadRequestReply,
  buildFailureReply,
  buildReply
}
