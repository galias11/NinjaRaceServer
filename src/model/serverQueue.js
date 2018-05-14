const { getCurrentTimeStamp } = require('../utilities');

class Queue {
  constructor(levelId, queueObserver) {
    this.levelId = levelId;
    this.waitingPlayers = [];
    this.queueObserver = queueObserver;
  }

  addPlayer(player, sessionIp, sessionPort) {
    let success = false;
    if(player) {
      this.waitingPlayers.push({
        player: player,
        ip: sessionIp,
        port: sessionPort,
        arrivalTime: getCurrentTimeStamp()
      });
      this.queueObserver(this);
      success = true;
    }
    return success;
  }

  removePlayer(playerId) {
    this.waitingPlayers = this.waitingPlayers.filter(waitingPlayer => {
      return waitingPlayer.player.internalId != playerId;
    });
  }

  getAverageWaitingTime() {
    let currentTime = getCurrentTimeStamp();
    let playerQuantity = this.waitingPlayers.length;
    if(playerQuantity) {
      let totalTime = 0.0;
      this.waitingPlayers.forEach(player => {
        totalTime += currentTime - player.arrivalTime;
      })
      return totalTime / playerQuantity;
    }
    return playerQuantity;
  }

  getWaitingPlayers() {
    return this.waitingPlayers.length;
  }

  playerInQueue(playerId) {
    return this.waitingPlayers.find(waitingPlayer => {
      return waitingPlayer.player.internalId == playerId;
    });
  }
}

module.exports = Queue;
