class Level {
  constructor(id, clientFile, token, secret) {
    this.id = id;
    this.clientFile = clientFile;
    this.token = token;
    this.secret = secret;
    this.available = true;
  }

  levelDisable() {
    this.available = false;
  }

  levelEnable() {
    this.available = true;
  }
}

module.exports = Level
