// @utilities
const {
    buildMessage,
    createPublisher,
    logger,
    sanitizeData
} = require('../utilities');

// @Constants
const {
    ENABLE_GODOT_WS_SANITIZER,
    SESSION_MSG_TYPE_ABORT,
    SESSION_MSG_TYPE_CREATE,
    SESSION_MSG_TYPE_CREATED,
    SESSION_MSG_TYPE_END,
    SESSION_MSG_TYPE_ERR,
    SESSION_MSG_TYPE_PLAYER_DISCONNECTED,
    SESSION_STATE_INITIALIZED,
    SESSION_STATE_VALIDATED,
    SESSION_STATE_SYNCHRONIZING,
    SESSION_STATE_STARTED,
    SESSION_STATE_FINISHED,
    SESSION_STATE_ABORT
} = require('../constants');

// @Model
const Player = require('./serverPlayer');
const {
    AbortState,
    InitializedState
} = require('./sessionState');

class SessionProccess {
    constructor() {
        this.id = 0;
        this.players = [];
        this.playersFinished = 0;
        this.gameLoop = undefined;

        this.checkEndingCondition = this.checkEndingCondition.bind(this);
        this.clearGameLoopInterval = this.clearGameLoopInterval.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
        this.handlePublisherIncomingData = this.handlePublisherIncomingData.bind(this);
        this.initSession = this.initSession.bind(this);
        this.notifyState = this.notifyState.bind(this);
        this.removePlayer = this.removePlayer.bind(this);
        this.setGameLoopInterval = this.setGameLoopInterval.bind(this);
        this.setState = this.setState.bind(this);

        //Forked session process reducer
        process.on('message', data => {
            switch (data.type) {
                case SESSION_MSG_TYPE_CREATE:
                    this.initSession(data.payload);
                    break;
                case SESSION_MSG_TYPE_ABORT:
                    this.setState(new AbortState(this));
                    break;
                case SESSION_MSG_TYPE_PLAYER_DISCONNECTED:
                    this.removePlayer(data.payload);
                    break;
                default:
                    break;
            }
        });
    }

    //Initializes session publisher
    initSession(data){
        createPublisher((err, pub) => {
            if(err) {
                process.send({
                    type: SESSION_MSG_TYPE_ERR,
                    payload: 'An error ocurred while creating game session'
                })
            } else {
                const port = pub.port;
                this.id = port;
                this.publisher = pub.pub;

                data.players.forEach(player => {
                    player.sessionConnected = true;
                    this.players.push(Object.assign(new Player(), player));
                });

                this.level = data.level;
                this.sessionToken = data.token;
                process.send(buildMessage(SESSION_MSG_TYPE_CREATED, port));

                this.publisher.on('connection', ws => {
                    ws.on('message', message => {
                        let incomingData;
                        try {
                            if(ENABLE_GODOT_WS_SANITIZER) {
                                incomingData = JSON.parse(sanitizeData(message));
                            }
                            else {
                                incomingData = JSON.parse(message);
                            }
                            this.handlePublisherIncomingData(incomingData, ws);
                        } catch(err) {
                            //ignores non JSON parseable msgs
                        }
                    });
                });

                this.state = new InitializedState(this);
            }
        });
    }



    //Notifies state changes to main loop
    notifyState(stateId) {
        const sessionId = this.id;
        const connectedPlayers = this.players.length;
        switch (stateId) {
            case SESSION_STATE_INITIALIZED:
                logger(`game session ${sessionId} has been created`);
                process.send(buildMessage(SESSION_MSG_TYPE_CREATED));
                break;
            case SESSION_STATE_VALIDATED:
                logger(`session ${sessionId} validated with ${connectedPlayers} players`);
                break;
            case SESSION_STATE_SYNCHRONIZING:
                logger(`session ${sessionId} started sync process`);
                break;
            case SESSION_STATE_STARTED:
                logger(`session ${sessionId} started game with ${connectedPlayers} players`);
                break;
            case SESSION_STATE_FINISHED:
                logger(`session ${sessionId} finished`);
                process.send(buildMessage(SESSION_MSG_TYPE_END));
                break;
            case SESSION_STATE_ABORT:
                logger(`session ${sessionId} was aborted`);
                process.send(buildMessage(SESSION_MSG_TYPE_ABORT));
                break;
            default:
                break;
        }
    }

    //Handles session incoming data
    handlePublisherIncomingData(incomingData, connection){
        this.state.handleIncomingData(incomingData, connection);
    }

    //Handles a client disconnect event
    handleDisconnect(player) {
        player.sessionConnected = false;
        const playerData = { playerId: player.internalId };
        this.removePlayer(player.internalId);
        process.send(buildMessage(SESSION_MSG_TYPE_PLAYER_DISCONNECTED, playerData));
    }

    //Removes a player from the game session
    removePlayer(playerId) {
        this.players = this.players.filter(player => {
            return player.internalId != playerId
        });
    }

    //Changes session state
    setState(state) {
        this.state = state;
    }

    //increases the finished players counter
    playerFinished() {
        this.playersFinished += 1;
    }

    //Checks if the all players had finished
    checkEndingCondition() {
        return this.playersFinished == this.players.length
    }

    //Set game session loop
    setGameLoopInterval(gameLoop) {
        this.gameLoop = gameLoop;
    }

    //Clears game loop interval
    clearGameLoopInterval() {
        clearInterval(this.gameLoop);
    }
}

new SessionProccess();
