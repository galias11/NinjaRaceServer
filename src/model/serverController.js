// @Utilities
const {
  findAvatarById,
  findLevel,
  findPlayerById,
  findPlayerByEmail,
  findQueueById,
  validateSessionPort
} = require('../utilities');

// @Model classes
const Level = require('./serverLevel');
const Queue = require('./serverQueue');
const {
  loadAvatarsData,
  loadLevelsData,
  login,
  mapAvatars,
  mapLevels,
  mapPlayer,
  savePlayer
} = require('./serverMapper');

// @Constants
const {
  SERVER_SERVICE_CRO,
  SERVER_SERVICE_LOG,
  SERVER_SERVICE_REG,
  SERVER_SERVICE_LDAT,
  SERVER_SERVICE_DLG,
  SERVER_SERVICE_JQR,
  SERVER_SERVICE_LQR
} = require('../constants');

class Controller {
  constructor() {
    this.avatars = [];
    this.gameSessions = [];
    this.levels = [];
    this.players = [];
    this.queues = [];

    this.dlgPlayer = this.dlgPlayer.bind(this);
    this.getLevelData = this.getLevelData.bind(this);
    this.getSessionData = this.getSessionData.bind(this);
    this.initializeLevelsAndQueues = this.initializeLevelsAndQueues.bind(this);
    this.initializeAvatars = this.initializeAvatars.bind(this);
    this.insertPlayer = this.insertPlayer.bind(this);
    this.joinQueue = this.joinQueue.bind(this);
    this.leaveQueue = this.leaveQueue.bind(this);
    this.logPlayer = this.logPlayer.bind(this);
    this.queueObserver = this.queueObserver.bind(this);
    this.gameSessionObserver = this.gameSessionObserver.bind(this);
    this.registerPlayer = this.registerPlayer.bind(this);
    this.validatePlayerData = this.validatePlayerData.bind(this);
    this.validateLevelData = this.validateLevelData.bind(this);
    this.validatePortData = this.validatePortData.bind(this);
  }

  //Builds a reply data object
  buildReplyData(service, code, payload) {
    return {
      service: service,
      code: code,
      payload: payload
    }
  }

  //Initializes controller with data retrieved from ninjaRaceDB
  async initializeController(callback) {
    let err = await new Promise((resolve, reject) => {
      loadLevelsData(this.initializeLevelsAndQueues)
      resolve();
    })
      .then(() => {
        return false;
      })
      .catch(err => {
        return true;
      });

    err &= await new Promise((resolve, reject) => {
      loadAvatarsData(this.initializeAvatars);
      resolve();
    })
      .then(() => {
        return false;
      })
      .catch(err => {
        return true;
      })

    callback(err);
  }

  //After level data is retrieved from DB, creates levels and queues
  initializeLevelsAndQueues(retrievedData) {
    if(!retrievedData.error) {
      const levels = mapLevels(retrievedData);
      if(levels) {
        this.levels = levels;
        this.queues = this.levels.map(level => {
          return new Queue(level.id, this.queueObserver);
        });
      }
    }
  }

  //After avatar data is retrieved from DB, creates avatars
  initializeAvatars(retrievedData) {
    if(!retrievedData.error) {
      this.avatars = mapAvatars(retrievedData);
    }
  }

  //Register a new user
  async registerPlayer(email, pword, callback) {
    await new Promise((resolve, reject) => {
      savePlayer(email, pword, (reply) => {
        if(reply.error) {
          reject();
        }
        resolve(reply);
      });
    }).then(reply => {
      if(reply.exists) {
        callback(this.buildReplyData(SERVER_SERVICE_REG, 1));
      } else {
        callback(this.buildReplyData(SERVER_SERVICE_REG, 2));
      }
    }).catch(() => {
      callback(this.buildReplyData(SERVER_SERVICE_CRO, 3));
    });
  }

  //Logs a player into server
  async logPlayer(email, pword, callback) {
    const reply = await new Promise((resolve, reject) => {
      login(email, pword, (reply) => {
        if(reply.error) {
          reject();
        }
        resolve(reply);
      });
    }).then(response => {
      return this.insertPlayer(response);
    }).catch(() => {
      return this.buildReplyData(SERVER_SERVICE_CRO, 3);
    });

    callback(reply);
  }

  //After retrieving player data from DB concludes login operation.
  insertPlayer(data, callback) {
    let result;
    if(data.notFound) {
      result = this.buildReplyData(SERVER_SERVICE_LOG, 2);
    } else {
      const player = mapPlayer(data.playerData);
      if(findPlayerByEmail(player.email, this.players)){
        result = this.buildReplyData(SERVER_SERVICE_LOG, 1);
      } else {
        this.players.push(player);
        result = this.buildReplyData(
          SERVER_SERVICE_LOG,
          3,
          {
            playerId: player.internalId,
            token: player.generateToken()
          }
        );
      }
    }
    return result;
  }

  //Gets data from a particular level
  getLevelData(levelId) {
    let levelData = this.levels.map(level => {
      if((levelId && levelId == level.id) || !levelId) {
        const queueStats = this.getQueueStats(level.id);
        return {
          id: level.id,
          clientFile: level.clientFile,
          available: level.available,
          waitingPlayers: queueStats.waitingPlayers,
          averageWaitingTime: queueStats.averageWaitingTime,
          currentGames: this.getCurrentGameSessions(level.id)
        }
      }
    }).filter(level => {
      return level ? level : undefined;
    });

    if(levelData) {
      return this.buildReplyData(SERVER_SERVICE_LDAT, 1, levelData);
    }
    return this.buildReplyData(SERVER_SERVICE_CRO, 2);
  }

  //Gets player session data
  getSessionData(playerId) {
    const player = findPlayerById(playerId, this.players);
    return player;
  }

  //Logouts a player from the server
  dlgPlayer(playerId) {
    let replyCode;
    const player = findPlayerById(playerId, this.players);
    if(player) {
      const index = this.players.indexOf(player);
      this.players.splice(index, 1);
      replyCode = 1;
    } else {
      replyCode = 2;
    }
    return this.buildReplyData(SERVER_SERVICE_DLG, replyCode);
  }

  //Port validation process. Validates a port which is being listened by a client
  validatePortData(sessionIp, sessionPort, player, callback) {
    new Promise((resolve, reject) => {
      validateSessionPort(sessionIp, sessionPort, incomingData => {
        resolve(JSON.parse(incomingData));
      })
      setTimeout(() => {
        reject();
      }, 5000);
    }).then(data => {
      callback(data, player);
    }).catch(() => {
      callback(undefined, player);
    });
  }

  //Validates player data and port and, if valid, joins player to a queue for a specific level
  joinQueue(levelId, playerId, avatarId, nick, sessionIp, sessionPort, callback) {
    const player = findPlayerById(playerId, this.players);
    if(!player) {
      callback(this.buildReplyData(SERVER_SERVICE_CRO, 2));
    }

    const reply = new Promise((resolve, reject) => {
      this.validatePortData(sessionIp, sessionPort, player, (data) => {
        if(!data || !data.id || !data.email) {
          reject();
        }
        if(!(player.internalId == data.id && player.email == data.email)) {
          reject();
        }
        resolve();
      })
    }).then(() => {
      const playerData = this.validatePlayerData(playerId, avatarId);
      const queueData = this.validateLevelData(levelId);
      let reply;
      if(playerData.valid && queueData.valid){
        playerData.player.setSessionData(playerData.avatar, nick);
        queueData.queue.addPlayer(playerData.player, sessionIp, sessionPort);
        reply = this.buildReplyData(SERVER_SERVICE_JQR, 1, {queueId: queueData.queue.levelId});
      } else if(playerData.inQueue) {
        reply = this.buildReplyData(SERVER_SERVICE_JQR, 3);
      } else {
        reply = this.buildReplyData(SERVER_SERVICE_CRO, 2);
      }
      callback(reply);
    }).catch(() => {
      callback(this.buildReplyData(SERVER_SERVICE_JQR, 2));
    })
  }

  //Validates data and removes a player from a queue
  leaveQueue(playerId, queueId, callback) {
    let reply;
    const queue = findQueueById(queueId, this.queues);
    if(queue && queue.playerInQueue(playerId)) {
      queue.removePlayer(playerId);
      reply = this.buildReplyData(SERVER_SERVICE_LQR, 1);
    } else {
      reply = this.buildReplyData(SERVER_SERVICE_CRO, 2);
    }
    callback(reply);
  }

  //Checks if a player id is valid and if this player is actually waiting in a queue
  validatePlayerData(playerId, avatarId) {
    const player = findPlayerById(playerId, this.players);
    const playerInQueue = this.queues.find(queue => {
      return queue.playerInQueue(playerId);
    });
    const avatar = findAvatarById(avatarId, this.avatars);

    const valid = player && !playerInQueue && avatar;
    return {
      valid: valid,
      inQueue: playerInQueue,
      player: player,
      avatar: avatar
    }
  }

  //Checks if a level is valid and if that level has an active queue
  validateLevelData(levelId) {
    const level = this.levels.find(level => {
      return level.id == levelId;
    })
    const queue = this.queues.find(queue => {
      return queue.levelId == levelId
    })
    const valid = level && queue;
    return {
      valid: valid,
      level: level,
      queue: queue
    }
  }

  getCurrentGameSessions(levelId) {
    return this.gameSessions.filter(session => {
      return session.levelId === levelId;
    }).length
  }

  getQueueStats(levelId) {
    const queue = this.queues.find(queue => {
      return queue.levelId === levelId;
    })

    return {
      waitingPlayers: queue.getWaitingPlayers(),
      averageWaitingTime: queue.getAverageWaitingTime()
    }
  }

  queueObserver(queue) {
    console.log("Mock up --> queue observer");
  }

  gameSessionObserver(gameSession) {

  }
}

module.exports = Controller;
