// @Utilities
const {
  generateToken,
  validateToken
} = require('../utilities');

class Player {
  constructor(internalId, email) {
    this.internalId = internalId;
    this.email = email;
    this.sessionNick = '';
    this.sessionAvatar = undefined;
    this.inactiveTime = 0;
    this.sessionPort = '';
    this.sessionIp = '';
    this.queueArrivalTime = 0.0;
    this.sessionValidated = false;
    this.sessionReady = false;
    this.sessionState = {};
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

  updateSessionState(posX, posY, directionId){
    this.sessionState = {
      posX: posX,
      posY: posY,
      directionId: directionId
    }
  }

}

module.exports = Player;
