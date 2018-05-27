// --> Server main loop

// @Vendor
const Hapi = require('hapi'); //@npm MIT license
const CookieAuth = require('hapi-auth-cookie'); //@npm MIT license

// @Handlers
const handlers = require('./handlers');

// @Constants
const routes = require('./routes');
const {
  SERVER_COOKIE_TTL,
  SERVER_MAIN_HOST,
  SERVER_MAIN_PORT,
  SERVER_MAIN_METHOD_GET,
  SERVER_MAIN_METHOD_POST
} = require('./constants');

// @Utilities
const { logger } = require('./utilities');

// @ServerLogic
const {
  Controller
} = require('./model');

//Creates the model controller object
const controller = new Controller();

//SetUps and starts server
async function serverInitialize() {

  // Server ip and port configuration
  const server = Hapi.server({
    host: SERVER_MAIN_HOST,
    port: SERVER_MAIN_PORT
  });

  //Server plugins
  server.register({
    plugin: CookieAuth
  })

  //Register model methods into server
  server.method('getLevelData', controller.getLevelData, {});
  server.method('saveNewPlayer', controller.registerPlayer, {});
  server.method('logPlayer', controller.logPlayer, {});
  server.method('dlgPlayer', controller.dlgPlayer, {});
  server.method('getSessionData', controller.getSessionData, {});
  server.method('joinQueue', controller.joinQueue, {});
  server.method('leaveQueue', controller.leaveQueue, {});
  server.method('removePlayerFromSession', controller.removePlayerFromSession, {});
  server.method('abortJoinQueue', controller.abortJoinQueue, {});

  server.events.on({ name: 'request' }, (request, event, tags) => {
    if(tags.abort) {
      handlers.handleAbort(request);
    }
  })

  //Server authentication settings
  const options = {
    password: '@|@|@|@this@is@n1nj4@r4c3@server@password@auth@cookie@bro@|@|@|@',
    cookie: 'ninjaRaceCookie',
    isSecure: false,
    redirectTo: false,
    ttl: SERVER_COOKIE_TTL
  };

  //Defines authentication policy for handlers
  const authPolicy = {
    auth: {
      mode: 'try',
      strategy: 'session'
    },
    plugins: {'hapi-auth-cookie': {redirectTo: false}}
  };

  await server.auth.strategy('session', 'cookie', options);

  // Response to level data request
  server.route({
    method: SERVER_MAIN_METHOD_GET,
    path: routes.LEVEL_DATA_REQUEST,
    config: authPolicy,
    handler: handlers.handleLevelDataRequest
  });

  // Response to player register request
  server.route({
    method: SERVER_MAIN_METHOD_POST,
    path: routes.PLAYER_REGISTER_REQUEST,
    handler: handlers.handleRegisterPlayerRequest
  });

  // Response to login request
  server.route({
    method: SERVER_MAIN_METHOD_POST,
    path: routes.PLAYER_LOGIN_REQUEST,
    handler: handlers.handleLoginRequest
  });

  // Response to logout request
  server.route({
    method: SERVER_MAIN_METHOD_POST,
    path: routes.PLAYER_LOGOUT_REQUEST,
    config: authPolicy,
    handler: handlers.handleLogoutRequest
  });

  // Response to a joinQueue request
  server.route({
    method: SERVER_MAIN_METHOD_POST,
    path: routes.JOIN_QUEUE_REQUEST,
    config: authPolicy,
    handler: handlers.handleQueueJoinRequest
  });

  // Response to a leaveQueue request
  server.route({
    method: SERVER_MAIN_METHOD_POST,
    path: routes.LEAVE_QUEUE_REQUEST,
    config: {
      auth: authPolicy.auth,
      plugins: authPolicy.plugins,
      timeout: { socket: 600000, server: 540000 }
    },
    handler: handlers.handleQueueLeaveRequest
  });

  // Response to leaveSession request
  server.route({
    method: SERVER_MAIN_METHOD_POST,
    path: routes.LEAVE_SESSION_REQUEST,
    config: authPolicy,
    handler: handlers.handleSessionLeaveRequest
  })

  //After server is set up, we make server start in order to listen the desired port
  try {
    await server.start();
    console.log(`NinjaRace server is now running at port ${server.info.port}`);
  } catch(err) {
    console.log(err);
    process.exit(1);
  }
}

controller.initializeController((err) => {
  if(err) {
    logger('Server could not be initialized due to data retrieving from db error');
    process.exit(1);
  }
  serverInitialize();
});
