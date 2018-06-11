// @Utilities
const {
    findRecordByLevelId,
    generateToken,
    validateToken
} = require('../utilities');

// @Constants
const {
    PLAYER_STATE_FINISHED,
    PLAYER_STATE_INIT,
    PLAYER_STATE_PLAYING
} = require('../constants');

// @Model
const Record = require('./serverRecord')

class Player {
    constructor(internalId, email, records) {
        this.internalId = internalId;
        this.email = email;
        this.sessionNick = '';
        this.sessionAvatar = undefined;
        this.inactiveTime = 0;
        this.queueArrivalTime = 0.0;
        this.queueListener = undefined;
        this.sessionSocket = undefined;
        this.sessionConnection = undefined;
        this.sessionValidated = false;
        this.sessionReady = false;
        this.sessionState = {};
        this.sessionConnected = false;
        this.gameStartTime = 0.0;
        this.gameFinishTime = 0.0;
        this.records = records;

        this.shouldUpdateRecord = this.shouldUpdateRecord.bind(this);
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

    setSessionData(avatar, color, nick) {
        this.sessionAvatar = avatar;
        this.sessionColor = color;
        this.sessionNick = nick;
    }

    //Validates player token
    validate(token) {
        return validateToken(token, this.secret);
    }

    updateSessionState(posX, posY, directionId, state){
        const newState = state ? state : this.sessionState.state;
        let timeStamp;

        if(this.sessionState.state === PLAYER_STATE_INIT && newState === PLAYER_STATE_PLAYING) {
            timeStamp = new Date();
            this.gameStartTime = timeStamp.getTime();
        }
        if(this.sessionState.state === PLAYER_STATE_PLAYING && newState === PLAYER_STATE_FINISHED) {
            timeStamp = new Date();
            this.gameFinishTime = timeStamp.getTime();
        }

        this.sessionState = {
            posX: posX,
            posY: posY,
            directionId: directionId,
            state: newState
        }
    }

    //Checks if the player has ended
    hasFinished() {
        if(this.state) {
            return this.state.state == PLAYER_STATE_FINISHED;
        }
    }

    //Returns time to finish current session level
    getGameTime() {
        let time;
        if(this.sessionState && this.sessionState.state == PLAYER_STATE_FINISHED) {
            time = this.gameFinishTime - this.gameStartTime;
        }
        return time;
    }

    //Updates player's record for a given level
    updateRecord(level, time) {
        let prevRecord;
        const record = findRecordByLevelId(level.id, this.records);
        if(record) {
            prevRecord = record.time;
            record.time = time;
        } else {
            this.records.push(new Record(level, time));
        }
        return prevRecord;
    }

    //Returns if a player's record should be updated
    shouldUpdateRecord(levelId, time) {
        const record = findRecordByLevelId(levelId, this.records);
        return !record || time < record.time;
    }

    //Resets player state to the state it had when it just logged in
    setInitialState() {
        this.sessionNick = '';
        this.sessionAvatar = undefined;
        this.sessionColor = undefined;
        this.inactiveTime = 0;
        this.queueArrivalTime = 0.0;
        this.queueListener = undefined;
        this.sessionSocket = undefined;
        this.sessionConnection = undefined;
        this.sessionValidated = false;
        this.sessionReady = false;
        this.sessionState = {};
        this.sessionConnected = false;
        this.gameStartTime = 0.0;
        this.gameFinishTime = 0.0;
    }
}

module.exports = Player;
