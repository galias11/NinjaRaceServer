// @Vendor
const Joi = require('joi'); //npm @Joi BSD-3 license

// @Constants
const {
  SESSION_SC_COMM_ACK,
  SESSION_SC_COMM_LOAD_FINISH,
  SESSION_SC_COMM_UPDATE,
  PLAYER_STATE_FINISHED,
  PLAYER_STATE_PLAYING
} = require('../constants');

const registerPlayerSchema = Joi.object().keys({
  email: Joi.string().email().required(),
  pword: Joi.string().alphanum().required()
});

const levelRequestSchema = Joi.object().keys({
  levelId: Joi.number().integer()
});

const joinQueueRequestSchema = Joi.object().keys({
  levelId: Joi.number().integer().required(),
  avatarId: Joi.number().integer().required(),
  nick: Joi.string().min(1).max(16).required()
});

const leaveQueueRequestSchema = Joi.object().keys({
  queueId: Joi.number().integer().required()
});

const gameLeaveRequestSchema = Joi.object().keys({
  sessionId: Joi.number().integer().required()
});

const loginRequestSchema = Joi.object().keys({
  email: Joi.string().email().required(),
  pword: Joi.string().alphanum().required()
});

//TODO: add player token as required when in production
const sessionConnValidationSchema = Joi.object().keys({
  type: Joi.number().valid(SESSION_SC_COMM_ACK).required(),
  payload: Joi.object().keys({
    sessionToken: Joi.string().required(),
    playerId: Joi.number().integer().required(),
    playerToken: Joi.string().allow('')
  }),
  connection: Joi.any()
});

const sessionLoadFinishSchema = Joi.object().keys({
  type: Joi.number().valid(SESSION_SC_COMM_LOAD_FINISH).required(),
  payload: Joi.object().keys({
    playerId: Joi.number().integer().required()
  })
});

const sessionPlayerUpdateSchema = Joi.object().keys({
  type: Joi.number().valid(SESSION_SC_COMM_UPDATE).required(),
  payload: Joi.object().keys({
    playerId: Joi.number().integer().required(),
    position: Joi.object().keys({
      x: Joi.number().required(),
      y: Joi.number().required()
    }),
    directionId: Joi.number().integer().required(),
    state: Joi.string().valid([PLAYER_STATE_FINISHED, PLAYER_STATE_PLAYING]).required()
  })
});

const sessionIncomingData = Joi.alternatives().try(
  sessionConnValidationSchema,
  sessionLoadFinishSchema,
  sessionPlayerUpdateSchema
);

const validateData = (data, schema, options) => {
  if(data) {
    const result = Joi.validate(data, schema, options);
    return result.error === null;
  }
}

const schemas = {
  gameLeaveRequestSchema,
  joinQueueRequestSchema,
  leaveQueueRequestSchema,
  levelRequestSchema,
  loginRequestSchema,
  registerPlayerSchema,
  sessionConnValidationSchema,
  sessionLoadFinishSchema,
  sessionPlayerUpdateSchema,
  sessionIncomingData
}

module.exports = {
  schemas,
  validateData
}
