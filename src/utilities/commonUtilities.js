//Finds a level with the requested id
const findLevel = (id, levels) => {
    if(levels) {
        return levels.find(level => {
            return level.id == id;
        });
    }
};

//Finds a player with the requested email in a player list
const findPlayerByEmail = (email, players) => {
    if(players) {
        return players.find(player => {
            return player.email == email;
        });
    }
};

//Finds a player with the requested id in a players list
const findPlayerById = (id, players) => {
    if(players) {
        return players.find(player => {
            return player.internalId == id;
        });
    }
};

//Finds a queue with the requested id
const findQueueById = (id, queues) => {
    if(queues) {
        return queues.find(queue => {
            return queue.levelId == id;
        });
    }
};

//Finds an Avatar with the requested id
const findAvatarById = (id, avatars) => {
    if(avatars) {
        return avatars.find(avatar => {
            return avatar.id == id;
        });
    }
};

//Finds a game session by its session id
const findSessionById = (id, sessions) => {
    if(sessions) {
        return sessions.find(session => {
            return session.sessionId == id;
        });
    }
};

//Finds a record by its level id
const findRecordByLevelId = (levelId, records) => {
    if(records) {
        return records.find(record => {
            return record.level && record.level.id == levelId;
        })
    }
}

//Builds a message for IPC comm
const buildMessage = (type, payload) => {
    return {
        type,
        payload: payload
    }
}

//Sanitizes godot client websocket data
const sanitizeData = (msg) => {
    if(msg) {
        const dataChunks = msg.match(/.{1,104}/g);
        //console.log(dataChunks); 
        let sanitizeData;
        dataChunks.forEach(chunk => {
            sanitizeData += chunk.substring(4);
        });
        return sanitizeData.split('undefined')[1];
    }
}

module.exports = {
    buildMessage,
    findAvatarById,
    findLevel,
    findPlayerById,
    findPlayerByEmail,
    findQueueById,
    findRecordByLevelId,
    findSessionById,
    sanitizeData
};
