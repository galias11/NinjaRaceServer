// --> HTTP request handlers index

const levelHandlers = require('./levelHandler');
const playerHandlers = require('./playerHandler');

module.exports = {
  ...levelHandlers,
  ...playerHandlers
}
