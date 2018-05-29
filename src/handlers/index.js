// --> HTTP request handlers index

const levelHandlers = require('./levelHandler');
const playerHandlers = require('./playerHandler');
const abortHandlers = require('./abortHandler');

module.exports = {
    ...abortHandlers,
    ...levelHandlers,
    ...playerHandlers
}
