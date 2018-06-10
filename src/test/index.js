
// @DBSetup
const dbEnvironment = require('./dbEnvironmentSetup');

// @ServerMockData
const svEnvironment = require('./serverEnvironmentSetup');


module.exports = {
    dbEnvironment,
    svEnvironment
};