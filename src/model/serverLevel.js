class Level {
  constructor(id, clientFile, startingPosX, startingPosY, startingDirectionId) {
    this.id = id;
    this.clientFile = clientFile;
    this.available = true;
    this.startingPosX = startingPosX;
    this.startingPosY = startingPosY;
    this.startingDirectionId = startingDirectionId;
  }

  levelDisable() {
    this.available = false;
  }

  levelEnable() {
    this.available = true;
  }
}

module.exports = Level
