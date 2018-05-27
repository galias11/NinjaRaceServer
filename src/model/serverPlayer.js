// @Utilities
const {
  generateToken,
  validateToken
} = require('../utilities');

// @Constants
const {
  PLAYER_STATE_FINISHED,
  PLAYER_STATE_INIT,
  PLAYER_STATE_PLAYING
} = require('../constants');

class Player {
  constructor(internalId, email) {
    this.internalId = internalId;
    this.email = email;
    this.sessionNick = '';
    this.sessionAvatar = undefined;
    this.inactiveTime = 0;
    this.queueArrivalTime = 0.0;
    this.queueListener = undefined;
    this.sessionSocket = undefined;
    this.sessionConnection = undefined;
    this.sessionValidated = false;
    this.sessionReady = false;
    this.sessionState = {};
    this.sessionConnected = false;
    this.gameStartTime = 0.0;
    this.gameFinishTime = 0.0;
  }

  //Creates a token for the player an stores secret for further validation
  generateToken() {
    const token = generateToken();
    this.secret = token.secret;
    this.token = token.token;

    return token.token;
  }

  inactivityTimer() {

  }

  setSessionData(avatar, nick) {
    this.sessionNick = nick;
    this.sessionAvatar = avatar;
  }

  //Validates player token
  validate(token) {
    return validateToken(token, this.secret);
  }

  updateSessionState(posX, posY, directionId, state){
    const newState = state ? state : this.sessionState.state;
    let timeStamp;

    if(this.sessionState.state === PLAYER_STATE_INIT && newState === PLAYER_STATE_PLAYING) {
      timeStamp = new Date();
      this.gameStartTime = timeStamp.getTime();
    }
    if(this.sessionState.state === PLAYER_STATE_PLAYING && newState === PLAYER_STATE_FINISHED) {
      timeStamp = new Date();
      this.gameFinishTime = timeStamp.getTime();
    }

    this.sessionState = {
      posX: posX,
      posY: posY,
      directionId: directionId,
      state: newState
    }
  }

  //Checks if the player has ended
  hasFinished() {
    if(this.state) {
      return this.state.state == PLAYER_STATE_FINISHED;
    }
  }

  //Returns time to finish current session level
  getGameTime() {
    let time;
    if(this.sessionState && this.sessionState.state == PLAYER_STATE_FINISHED) {
      time = this.gameFinishTime - this.gameStartTime;
    }
    return time;
  }

  //Resets player state to the state it had when it just logged in
  setInitialState() {
    this.sessionNick = '';
    this.sessionAvatar = undefined;
    this.inactiveTime = 0;
    this.queueArrivalTime = 0.0;
    this.queueListener = undefined;
    this.sessionSocket = undefined;
    this.sessionConnection = undefined;
    this.sessionValidated = false;
    this.sessionReady = false;
    this.sessionState = {};
    this.sessionConnected = false;
    this.gameStartTime = 0.0;
    this.gameFinishTime = 0.0;
  }
}

module.exports = Player;
