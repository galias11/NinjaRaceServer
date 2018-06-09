// @utilities
const {
    comparePassword,
    cryptPassword,
    insertStatement,
    mysqlQuery,
    selectStatement
} = require('../utilities');

// @Model classes
const Level = require('./serverLevel');
const Player = require('./serverPlayer');
const Avatar = require('./serverAvatar');

// @Constants
const {
    SERVER_TABLE_LEVELS,
    SERVER_TABLE_PLAYER,
    SERVER_TABLE_AVATAR,
    SERVER_DB_QUOTED_TYPE
} = require('../constants');

//Maps retrieved data into levels and queues
const mapLevels = (retrievedData) => {
    if(retrievedData) {
        return retrievedData.data.map(level => {
            return new Level(level.levelId, level.clientFileRef, level.startingPosX,
                       level.startingPosY, level.startingDirectionId);
        });
    }
}

//Maps a retrieved player
const mapPlayer = (retrievedData) => {
    if(retrievedData) {
        return new Player(retrievedData.id, retrievedData.email);
    }
}

//Maps a retrieced avatar
const mapAvatars = (retrievedData) => {
    if(retrievedData) {
        return retrievedData.data.map(avatar => {
            return new Avatar(avatar.id, avatar.clientFileRef);
        })
    }
}

//Gets all level registers from database
const loadLevelsData = (callback) => {
    const statement = selectStatement(SERVER_TABLE_LEVELS);
    mysqlQuery(statement, callback);
}

//Gets all avatar registers from database
const loadAvatarsData = (callback) => {
    const statement = selectStatement(SERVER_TABLE_AVATAR);
    mysqlQuery(statement, callback);
}

//Saves a new player register data to DB.
async function savePlayer(email, pword, callback){
    const emailData = {
        type: SERVER_DB_QUOTED_TYPE,
        data: email
    }
    const pwordData = {
        type: SERVER_DB_QUOTED_TYPE,
        data: cryptPassword(pword)
    }
    const whereClause = `email = '${email}'`;
    const searchData = selectStatement(SERVER_TABLE_PLAYER, whereClause);
    const insertData = insertStatement(SERVER_TABLE_PLAYER, ['email', 'pword'], [emailData, pwordData]);

    const reply = await new Promise((resolve, reject) => {
        mysqlQuery(searchData, (response) => {
            if(response.error) {
                reject();
            }
            resolve(response);
        });
    }).then(response => {

        if(response.data.length) {
            return { exists: true };
        }

        return new Promise((resolve, reject) => {
            mysqlQuery(insertData, (response) => {
                if(response.error) {
                    reject();
                }
                resolve(response)
            });
        }).then(response => {
            return { success: response.data };
        }).catch(() => {
            return { error: true };
        })
    }).catch(() => {
        return { error: true };
    });

    callback(reply);
}

//Compares data and logs an user into the system
async function login(email, pword, callback) {
    const whereClause = `email = '${email}'`;
    const searchData = selectStatement(SERVER_TABLE_PLAYER, whereClause);

    const reply = await new Promise((resolve, reject) => {
        mysqlQuery(searchData, (response) => {
            if(response.error || response.data.length != 1) {
                reject();
            }
            resolve(response);
        });
    }).then((response) => {
        if(!response.data.length || !comparePassword(pword, response.data[0].pword)){
            return {playerData: undefined, error: false, notFound: true};
        } else {
            return {playerData: response.data[0]};
        }
    }).catch(() => {
        return {playerData: undefined, error: true};
    });

    callback(reply);
}

module.exports = {
    loadAvatarsData,
    loadLevelsData,
    login,
    mapAvatars,
    mapLevels,
    mapPlayer,
    savePlayer
}
