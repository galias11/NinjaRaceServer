// @utilities
const {
    comparePassword,
    cryptPassword,
    findLevel,
    insertStatement,
    mysqlQuery,
    selectStatement,
    updateStatement
} = require('../utilities');

// @Model classes
const Level = require('./serverLevel');
const Player = require('./serverPlayer');
const Avatar = require('./serverAvatar');
const Record = require('./serverRecord');

// @Constants
const {
    SERVER_TABLE_LEVELS,
    SERVER_TABLE_PLAYER_RECORDS,
    SERVER_TABLE_PLAYER,
    SERVER_TABLE_AVATAR,
    SERVER_TABLE_RECORD,
    SERVER_DB_NON_QUOTED_TYPE,
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
const mapPlayer = (retrievedData, records) => {
    if(retrievedData) {
        return new Player(retrievedData.id, retrievedData.email, records);
    }
}

//Returns an array with all the found records for a player
const mapRecords = (retrievedData, levels) => {
    if(retrievedData.length && retrievedData[0].levelId) {
        const records = retrievedData.map(record => {
            const level = findLevel(record.levelId, levels);
            return new Record(level, record.time);
        });
        return records;
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

//Creates a new record entry on the database or updates and existing one depending on if it exists
async function saveRecord(playerId, levelId, time, exists) {
    let reply;
    let statement;

    if(exists) {
        const values = [{
            type: SERVER_DB_NON_QUOTED_TYPE,
            col: 'time',
            value: time
        }];
        const condition = `playerId = ${playerId} AND levelId = ${levelId}`;
        statement = updateStatement(SERVER_TABLE_RECORD, condition, values);
    } else {
        const playerIdData = {
            type: SERVER_DB_NON_QUOTED_TYPE,
            data: playerId
        };
        const levelIdData = {
            type: SERVER_DB_NON_QUOTED_TYPE,
            data: levelId
        };
        const timeData = {
            type: SERVER_DB_NON_QUOTED_TYPE,
            data: time
        };
        statement = insertStatement(SERVER_TABLE_RECORD, ['playerId', 'levelId', 'time'], [playerIdData, levelIdData, timeData]);
    }
    
    reply = await new Promise((resolve, reject) => {
        mysqlQuery(statement, response => {
            if(response.error) {
                reject();
            }
            resolve(response);
        });
    }).then(response => {
        return { sucess: response.data };
    }).catch(() => {
        return { error: true };
    });

    return reply;
}

//Compares data and logs an user into the system
async function login(email, pword, callback) {
    const whereClause = `email = '${email}'`;
    const searchData = selectStatement(SERVER_TABLE_PLAYER_RECORDS, whereClause);

    const reply = await new Promise((resolve, reject) => {
        mysqlQuery(searchData, (response) => {
            if(response.error) {
                reject();
            }
            resolve(response);
        });
    }).then((response) => {
        if(!response.data.length || !comparePassword(pword, response.data[0].pword)){
            return {playerData: undefined, error: false, notFound: true};
        } else {
            const playerData = {
                id: response.data[0].id,
                email: response.data[0].email,
                pword: response.data[0].pword
            };
            const playerRecordData = response.data
                .filter(record => record.playerId )
                .map(record => {
                    return {
                        levelId: record.levelId,
                        time: record.time
                    }
                });
            return {
                playerData,
                playerRecordData
            };
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
    mapRecords,
    savePlayer,
    saveRecord
}
