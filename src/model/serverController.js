// @Utilities
const {
    findAvatarById,
    findLevel,
    findPlayerById,
    findPlayerByEmail,
    findQueueById,
    findSessionById,
    logger
} = require('../utilities');

// @Model classes
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
    SERVER_USER_OVER_LOGIN_TIME,
    SERVER_SERVICE_CRO,
    SERVER_SERVICE_LOG,
    SERVER_SERVICE_REG,
    SERVER_SERVICE_LDAT,
    SERVER_SERVICE_DLG,
    SERVER_SERVICE_JQR,
    SERVER_SERVICE_LQR,
    SERVER_SERVICE_GSP,
    SESSION_MIN_START_PLAYERS,
    OBSERVER_MSG_ACTION_ABORT,
    OBSERVER_MSG_ACTION_ADD_PLAYER,
    OBSERVER_MSG_ACTION_END
} = require('../constants');

class Controller {
    constructor() {
        this.avatars = [];
        this.gameSessions = [];
        this.levels = [];
        this.players = [];
        this.queues = [];

        this.abortJoinQueue = this.abortJoinQueue.bind(this);
        this.dlgPlayer = this.dlgPlayer.bind(this);
        this.endSession = this.endSession.bind(this);
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
        this.removePlayer = this.removePlayer.bind(this);
        this.removePlayerFromSession = this.removePlayerFromSession.bind(this);
        this.validateLevelData = this.validateLevelData.bind(this);
        this.validatePlayerData = this.validatePlayerData.bind(this);

        //this.testMockLevels = this.testMockLevels.bind(this);
        //this.testMockPlayers = this.testMockPlayers.bind(this);
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
        let err = await new Promise((resolve) => {
            loadLevelsData(this.initializeLevelsAndQueues)
            resolve();
        })
            .then(() => {
                return false;
            })
            .catch(() => {
                return true;
            });

        err &= await new Promise((resolve) => {
            loadAvatarsData(this.initializeAvatars);
            resolve();
        })
            .then(() => {
                return false;
            })
            .catch(() => {
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

        //Activate only for testing purposes
        /*console.log(this.players);*/

        callback(reply);
    }

    //After retrieving player data from DB concludes login operation.
    insertPlayer(data) {
        let result;
        if(data.notFound) {
            result = this.buildReplyData(SERVER_SERVICE_LOG, 2);
        } else {
            const player = mapPlayer(data.playerData);
            if(findPlayerByEmail(player.email, this.players)){
                result = this.buildReplyData(SERVER_SERVICE_LOG, 1);
                setTimeout(() => {
                    this.removePlayer(player.internalId);
                }, SERVER_USER_OVER_LOGIN_TIME);
            } else {
                this.players.push(player);
                result = this.buildReplyData(
                    SERVER_SERVICE_LOG, 3,
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
            this.queues.forEach(queue => {
                queue.removePlayer(playerId)
            });
            this.gameSessions.forEach(gameSession => {
                gameSession.removePlayer(playerId, true);
            });
            this.removePlayer(playerId);
            replyCode = 1;
        } else {
            replyCode = 2;
        }

        // Enable this line only for testing purposes
        /*console.log(this.players);*/

        callback(this.buildReplyData(SERVER_SERVICE_DLG, replyCode));
    }

    //Validates player data and port and, if valid, joins player to a queue for a specific level
    joinQueue(levelId, playerId, avatarId, nick, callback) {
        const player = findPlayerById(playerId, this.players);
        if(!player) {
            callback(this.buildReplyData(SERVER_SERVICE_CRO, 2));
        }

        const playerData = this.validatePlayerData(playerId, avatarId);
        const queueData = this.validateLevelData(levelId);
        if(playerData.valid && queueData.valid){
            playerData.player.setSessionData(playerData.avatar, nick);
            queueData.queue.addPlayer(playerData.player, sessionData => {
                callback(this.buildReplyData(SERVER_SERVICE_JQR, 1, sessionData));
            });
        } else if(playerData.inQueue || playerData.inSession) {
            callback(this.buildReplyData(SERVER_SERVICE_JQR, 3));
        } else {
            callback(this.buildReplyData(SERVER_SERVICE_CRO, 2));
        }
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

        //Enable only for testing purposes
        /*this.queues.forEach(queue => {
            console.log(queue.levelId);
            console.log(queue.waitingPlayers);
        });*/

        callback(reply);
    }

    //Checks if a player id is valid and if this player is actually waiting in a queue
    validatePlayerData(playerId, avatarId) {
        const player = findPlayerById(playerId, this.players);
        const playerInQueue = this.queues.find(queue => {
            return queue.playerInQueue(playerId);
        });
        const playerInGameSession = this.gameSessions.find(session => {
            return session.playerInSession(playerId);
        });
        const avatar = findAvatarById(avatarId, this.avatars);

        const valid = player && !playerInQueue && !playerInGameSession && avatar;
        return {
            valid: valid,
            inQueue: playerInQueue,
            inSession: playerInGameSession,
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

    //Observes queues events
    queueObserver(queue, action) {
        switch(action) {
            case OBSERVER_MSG_ACTION_ADD_PLAYER:
                if(queue.getWaitingPlayers() >= SESSION_MIN_START_PLAYERS) {
                    logger('initializing new game session');
                    const players = queue.getNewSessionPlayers();
                    const level = findLevel(queue.levelId, this.levels)
                    const gameSession = new GameSession(level, players, this.gameSessionObserver);
                    gameSession.initializeSession();
                    this.gameSessions.push(gameSession);
                } else {
                    logger(`player added to queue N°${queue.levelId} waiting list`);
                }
                break;
            default:
                break;
        }

        //Use only for testing purposes
        /*console.log(queue.waitingPlayers);*/
    }

    //Observes created game session events
    gameSessionObserver(gameSession, action) {
        //Use only for testing purposes
        /*console.log(gameSession.players);*/
    
        switch(action) {
            case OBSERVER_MSG_ACTION_ABORT:
                this.endSession(gameSession);
                break;
            case OBSERVER_MSG_ACTION_END:
                this.endSession(gameSession);
                break;
            default:
                break;
        }
    }

    //Removes a game session from the registered sessions
    endSession(gameSession) {
        const index = this.gameSessions.indexOf(gameSession);
        if(index != -1){
            this.gameSessions.splice(index, index + 1);
        }
    }

    //Removes a player from the server connected players
    removePlayer(playerId) {
        this.players = this.players.filter(player => {
            return player.internalId != playerId;
        })
    }

    //Removes a player from a game session
    removePlayerFromSession(playerId, sessionId, callback) {
        const gameSession = findSessionById(sessionId, this.gameSessions);

        if(gameSession && gameSession.playerInSession(playerId)) {
            gameSession.removePlayer(playerId);
            callback(this.buildReplyData(SERVER_SERVICE_GSP, 1));
        } else {
            callback(this.buildReplyData(SERVER_SERVICE_CRO, 2));
        }
    }

    //Undo a joinQueue request once it has started
    abortJoinQueue(playerId, levelId) {
        const queue = findQueueById(levelId, this.queues);
        if(queue) {
            queue.removePlayer(playerId);
        }
    }

    //Enable the next methods only for testing
    /*
    //Mocks level data for testing
    testMockLevels(levels) {
        this.levels = levels.slice();
    }

    //Mocks player data for testing
    testMockPlayers(players) {
        this.players = players.slice();
    }
    */

}

module.exports = Controller;
