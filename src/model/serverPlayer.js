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
  }

  //Creates a token for the player an stores secret for further validation
  generateToken() {
    const token = generateToken();
    this.secret = token.secret;

    return token.token;
  }

  inactivityTimer() {

  }

  setSessionData(avatar, nick) {
    this.sessionNick = nick;
    this.sessionAvatar = avatar;
  }

}

module.exports = Player;
