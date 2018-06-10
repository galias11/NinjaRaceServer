// @Utilities
const { getCurrentTimeStamp } = require('../utilities');

// @Constants
const {
    OBSERVER_MSG_ACTION_ADD_PLAYER,
    SESSION_MIN_START_PLAYERS
} = require('../constants');

class Queue {
    constructor(levelId, queueObserver) {
        this.levelId = levelId;
        this.waitingPlayers = [];
        this.queueObserver = queueObserver;

        this.getNewSessionPlayers = this.getNewSessionPlayers.bind(this);
    }

    //Adds a new player into the queue
    addPlayer(player, queueListener) {
        let success = false;
        if(player) {
            player.queueListener = queueListener;
            player.queueArrivalTime = getCurrentTimeStamp();
            this.waitingPlayers.push(player);
            this.queueObserver(this, OBSERVER_MSG_ACTION_ADD_PLAYER);
            success = true;
        }
        return success;
    }

    //Removes a player from the queue
    removePlayer(playerId) {
        this.waitingPlayers = this.waitingPlayers.filter(waitingPlayer => {
            if(waitingPlayer.internalId == playerId) {
                waitingPlayer.sessionIp = '';
                waitingPlayer.sessionPort = '';
                waitingPlayer.queueArrivalTime = 0.0;
            }
            return waitingPlayer.internalId != playerId;
        });
    }

    //Calculates the average waiting time for players
    getAverageWaitingTime() {
        let currentTime = getCurrentTimeStamp();
        let playerQuantity = this.waitingPlayers.length;
        if(playerQuantity) {
            let totalTime = 0.0;
            this.waitingPlayers.forEach(player => {
                totalTime += currentTime - player.queueArrivalTime;
            })
            return totalTime / playerQuantity;
        }
        return playerQuantity;
    }

    //Gets all waitin players in the queue
    getWaitingPlayers() {
        return this.waitingPlayers.length;
    }

    //Returns if a player with the desired id is in the queue
    playerInQueue(playerId) {
        return this.waitingPlayers.find(waitingPlayer => {
            return waitingPlayer.internalId == playerId;
        });
    }

    //Gets the four players which have waited longer on the queue and removes them from the queue
    getNewSessionPlayers() {
        let players;
        if(this.waitingPlayers.length >= SESSION_MIN_START_PLAYERS) {
            players = this.waitingPlayers.slice(0, SESSION_MIN_START_PLAYERS);
            this.waitingPlayers.splice(0, SESSION_MIN_START_PLAYERS);
            this.queueObserver(this);
        }
        return players;
    }
}

module.exports = Queue;
