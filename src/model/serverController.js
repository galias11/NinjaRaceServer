// @Utilities
const {
  findAvatarById,
  findLevel,
  findPlayerById,
  findPlayerByEmail,
  findQueueById,
  logger,
  validateSessionPortUDP
} = require('../utilities');

// @Model classes
const Level = require('./serverLevel');
const Queue = require('./serverQueue');
const GameSession = require('./serverGameSession');
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
  SERVER_SERVICE_LQR,
  SERVER_MIN_GAME_PLAYERS,
  SERVER_MIN_SESSION_PLAYERS,
  SESSION_ACTION_ABORT,
  SESSION_ACTION_VALIDATE
} = require('../constants');

class Controller {
  constructor() {
    this.avatars = [];
    this.gameSessions = [];
    this.levels = [];
    this.players = [];
    this.queues = [];

    this.abortSession = this.abortSession.bind(this);
    this.dlgPlayer = this.dlgPlayer.bind(this);
    this.gameSessionObserver = this.gameSessionObserver.bind(this);
    this.getLevelData = this.getLevelData.bind(this);
    this.getSessionData = this.getSessionData.bind(this);
    this.initializeLevelsAndQueues = this.initializeLevelsAndQueues.bind(this);
    this.initializeAvatars = this.initializeAvatars.bind(this);
    this.insertPlayer = this.insertPlayer.bind(this);
    this.joinQueue = this.joinQueue.bind(this);
    this.leaveQueue = this.leaveQueue.bind(this);
    this.logPlayer = this.logPlayer.bind(this);
    this.queueObserver = this.queueObserver.bind(this);
    this.registerPlayer = this.registerPlayer.bind(this);
    this.validateSession = this.validateSession.bind(this);
    this.validateLevelData = this.validateLevelData.bind(this);
    this.validatePlayerData = this.validatePlayerData.bind(this);
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
  dlgPlayer(playerId, callback) {
    let replyCode;
    const player = findPlayerById(playerId, this.players);
    if(player) {
      const index = this.players.indexOf(player);
      this.players.splice(index, 1);
      this.queues.forEach(queue => {
        queue.removePlayer(playerId)
      });
      this.gameSessions.forEach(gameSession => {
        gameSession.removePlayer(playerId);
      })
      replyCode = 1;
    } else {
      replyCode = 2;
    }
    callback(this.buildReplyData(SERVER_SERVICE_DLG, replyCode));
  }

  //Validates player data and port and, if valid, joins player to a queue for a specific level
  joinQueue(levelId, playerId, avatarId, nick, sessionIp, sessionPort, callback) {
    const player = findPlayerById(playerId, this.players);
    if(!player) {
      callback(this.buildReplyData(SERVER_SERVICE_CRO, 2));
    }

    const reply = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        logger(`timeout reached for reply from ${sessionIp}:${sessionPort}`);
        reject();
      }, 5000);

      validateSessionPortUDP(sessionIp, sessionPort, incomingData => {
        clearTimeout(timer);
        const payload = incomingData.payload;
        if(incomingData.error || !incomingData.payload) {
          reject();
        }
        else if(!payload || !payload.playerId || !payload.email) {
          reject();
        }
        else if(!player || !(player.internalId == payload.playerId && player.email == payload.email)) {
          reject();
        } else {
          resolve();
        }
      });
    }).then(() => {
      const playerData = this.validatePlayerData(playerId, avatarId);
      const queueData = this.validateLevelData(levelId);
      let reply;
      if(playerData.valid && queueData.valid){
        playerData.player.setSessionData(playerData.avatar, nick);
        queueData.queue.addPlayer(playerData.player, sessionIp, sessionPort);
        logger('client listener check successful')
        reply = this.buildReplyData(SERVER_SERVICE_JQR, 1, {queueId: queueData.queue.levelId});
      } else if(playerData.inQueue) {
        reply = this.buildReplyData(SERVER_SERVICE_JQR, 3);
      } else {
        reply = this.buildReplyData(SERVER_SERVICE_CRO, 2);
      }
      callback(reply);
    }).catch(() => {
      callback(this.buildReplyData(SERVER_SERVICE_JQR, 2));
    });
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

  //
  getCurrentGameSessions(levelId) {
    return this.gameSessions.filter(session => {
      return session.level.id === levelId;
    }).length
  }

  //Retrieves stats for a particular level queue
  getQueueStats(levelId) {
    const queue = this.queues.find(queue => {
      return queue.levelId === levelId;
    })

    return {
      waitingPlayers: queue.getWaitingPlayers(),
      averageWaitingTime: queue.getAverageWaitingTime()
    }
  }

  //Observes queues and when players are enough a new game session is started.
  queueObserver(queue) {
    if(queue.getWaitingPlayers() >= SERVER_MIN_SESSION_PLAYERS) {
      logger('initializing new game session');
      const players = queue.getNewSessionPlayers();
      const level = findLevel(queue.levelId, this.levels)
      const gameSession = new GameSession(level, players, this.gameSessionObserver);
      gameSession.initializeSession();
      this.gameSessions.push(gameSession);
    }
  }

  //Observes created game session events
  gameSessionObserver(gameSession, action) {
    switch(action) {
      case SESSION_ACTION_VALIDATE:
        this.validateSession(gameSession);
        break;
      case SESSION_ACTION_ABORT:
        this.abortSession(gameSession);
        break;
      default:
        break;
    }
  }

  //Validates if a game can be started
  validateSession(gameSession) {
    const validatedPlayers = gameSession.validatedPlayers;
    const gameSessionId = gameSession.sessionId;
    logger(`processing game session ${gameSession.sessionId} validation`);
    if(validatedPlayers >= SERVER_MIN_GAME_PLAYERS) {
      logger(`game session ${gameSessionId} started with ${validatedPlayers} players`);
      gameSession.startGame();
    } else {
      logger(`game session ${gameSessionId} aborted due to not enough validated players`);
      gameSession.abortGame();
    }
  }

  //Aborts a recently created game session
  abortSession(gameSession) {
    const index = this.gameSessions.indexOf(gameSession);
    if(index != -1){
      this.gameSessions.splice(index, index + 1);
    }
  }
}

module.exports = Controller;