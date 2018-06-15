// @Vendor
const childProcess = require('child_process');

// @Utilities
const {
    buildMessage,
    findPlayerById,
    generateToken,
    logger
} = require('../utilities');

// @Constants
const {
    OBSERVER_MSG_ACTION_UPDATE_RECORD,
    SESSION_MIN_PLAYERS_ABORT,
    OBSERVER_MSG_ACTION_ABORT,
    OBSERVER_MSG_ACTION_END,
    SESSION_MSG_TYPE_ABORT,
    SESSION_MSG_TYPE_CREATE,
    SESSION_MSG_TYPE_CREATED,
    SESSION_MSG_TYPE_END,
    SESSION_MSG_TYPE_ERR,
    SESSION_MSG_TYPE_PLAYER_DISCONNECTED
} = require('../constants');

class GameSession {
    constructor(level, players, observer) {
        this.sessionObserver = observer;
        this.level = level;
        this.players = players;
        this.token = generateToken();
        this.ended = false;
        this.session = '';
        this.sessionId = '';
        this.validatedPlayers = 0;
        this.readyPlayers = 0;

        this.abortGame = this.abortGame.bind(this);
        this.finish = this.finish.bind(this);
        this.handleIncomingMsg = this.handleIncomingMsg.bind(this);
        this.initializeSession = this.initializeSession.bind(this);
        this.playerInSession = this.playerInSession.bind(this);
        this.removePlayer = this.removePlayer.bind(this);
        this.sendSessionData = this.sendSessionData.bind(this);
    }

    initializeSession() {
        this.session = childProcess.fork('./model/sessionProcess.js');

        const payload = {
            players: this.players,
            level: this.level,
            token: this.token
        };

        this.session.send(buildMessage(SESSION_MSG_TYPE_CREATE, payload));

        this.session.on('message', msg => {
            this.handleIncomingMsg(msg);
        })
    }

    //Removes a player from the game session
    removePlayer(playerId, notifySessionProcess) {
        const player = findPlayerById(playerId, this.players);
        if(player) {
            if(player.sessionValidated) {
                this.validatedPlayers -= 1;
            }
            if(player.sessionReady) {
                this.readyPlayers -= 1;
            }
            this.players = this.players.filter(player => {
                return player.internalId != playerId
            });
            player.setInitialState();
            if(notifySessionProcess) {
                this.session.send(buildMessage(SESSION_MSG_TYPE_PLAYER_DISCONNECTED, playerId));
            }

            if(this.players.length <= SESSION_MIN_PLAYERS_ABORT) {
                this.sessionObserver(this, OBSERVER_MSG_ACTION_ABORT);
            }
        }
    }

    //Returns if a player is in a game session
    playerInSession(playerId) {
        return this.players.find(player => {
            return player.internalId == playerId;
        });
    }

    //Aborts game start
    abortGame() {
        this.session.send(buildMessage(SESSION_MSG_TYPE_ABORT));
        this.sessionObserver(this, OBSERVER_MSG_ACTION_ABORT);
    }

    //Sends game session Data to client
    sendSessionData(port) {
        const sessionData = {
            sessionId: this.sessionId,
            sessionToken: this.token.token,
            sessionPort: port
        };
        this.players.forEach(player => {
            player.queueListener(sessionData);
        });
    }

    //Acts as a reducer between de gameSession controller and the session child process
    handleIncomingMsg(msg) {
        if(msg) {
            switch(msg.type) {
                case SESSION_MSG_TYPE_CREATED:
                    this.sessionId = msg.payload;
                    this.sendSessionData(msg.payload);
                    break;
                case SESSION_MSG_TYPE_PLAYER_DISCONNECTED:
                    this.removePlayer(msg.payload.playerId);
                    break;
                case SESSION_MSG_TYPE_END:
                    this.finish(msg.payload);
                    break;
                case SESSION_MSG_TYPE_ABORT:
                    this.finish();
                    break;
                case SESSION_MSG_TYPE_ERR:
                    logger(msg.payload);
                    this.finish();
                    break;
                default:
                    break;
            }
        }
    }

    //Successful end for the game session
    finish(playersTimes) {
        if(playersTimes) {
            this.players.forEach(player => {
                const playerTime = playersTimes.find(time => 
                    time.time && time.playerId == player.internalId
                );
                if(playerTime && player.shouldUpdateRecord(playerTime.levelId, playerTime.playerId)) {
                    this.sessionObserver(this, OBSERVER_MSG_ACTION_UPDATE_RECORD, playerTime);
                }
            })
        }
        this.players.forEach(player => {
            player.setInitialState();
        });
        this.sessionObserver(this, OBSERVER_MSG_ACTION_END);
    }
}

module.exports = GameSession;
