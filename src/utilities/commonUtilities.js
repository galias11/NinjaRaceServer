// @Utilities
const {
  selectStatement,
  mysqlQuery
} = require('./mysqlUtilities');

// @Constants
const {
  SERVER_TABLE_PLAYER
} = require('../constants');

//Finds a level with the requested id
const findLevel = (id, levels) => {
  if(levels) {
    return levels.find(level => {
      return level.id == id;
    })
  }
}

//Finds a player with the requested email in a player list
const findPlayerByEmail = (email, players) => {
  if(players) {
    return players.find(player => {
      return player.email == email
    })
  }
}

//Finds a player with the requested id in a players list
const findPlayerById = (id, players) => {
  if(players) {
    return players.find(player => {
      return player.internalId == id;
    })
  }
}

//Finds a queue with the requested id
const findQueueById = (id, queues) => {
  if(queues) {
    return queues.find(queue => {
      return queue.levelId == id;
    })
  }
}

//Finds an Avatar with the requested id
const findAvatarById = (id, avatars) => {
  if(avatars) {
    return avatars.find(avatar => {
      return avatar.id == id;
    })
  }
}

module.exports = {
  findAvatarById,
  findLevel,
  findPlayerById,
  findPlayerByEmail,
  findQueueById
}
