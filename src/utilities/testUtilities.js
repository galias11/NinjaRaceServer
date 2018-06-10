// @Utilities
const {
    mysqlQuery
} = require('./mysqlUtilities');

// Execs a SQL query to setup server environment
async function dbEnviromentSetup(script) {
    return await new Promise((resolve, reject) => {
        mysqlQuery(script, (response) => {
            if(response.error) {
                reject();
            }
            resolve();
        });
    }).then(() => {
        return true;
    }).catch(() => {
        return false;
    });
}

module.exports = {
    dbEnviromentSetup
};