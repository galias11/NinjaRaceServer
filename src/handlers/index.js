// --> HTTP request handlers index

const levelHandlers = require('./levelHandler');
const playerHandlers = require('./playerHandler');
const abortHandlers = require('./abortHandler');
const testHandlers = require('./testHandler');

module.exports = {
    ...abortHandlers,
    ...levelHandlers,
    ...playerHandlers,
    ...testHandlers
}
