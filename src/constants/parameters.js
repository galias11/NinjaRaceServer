//By adjusting these parameters several server behaviours can be adjusted
const sessionParameters = {
    ENABLE_GODOT_WS_SANITIZER: false,
    MYSQL_MULTIPLE_STATEMENTS: false, //Disable in prod environment
    NTP_ARGENTINA_POOL: 'ar.pool.ntp.org',
    NTP_PORT: 123,
    NTP_REQUEST_TIMEOUT: 5 * 1000,
    NTP_RESOLVE_REFERENCE: true,
    SERVER_USER_OVER_LOGIN_TIME: 5 * 1000,
    SESSION_AFTER_FIRST_LOAD_VALIDATION_TIME: 20 * 1000,
    SESSION_CONNECTION_VALIDATION_TIME: 25 * 1000,
    SESSION_MIN_START_PLAYERS: 4,
    SESSION_MIN_GAME_PLAYERS: 2,
    SESSION_MIN_PLAYERS_ABORT: 1,
    SESSION_POST_ABORT_PROCESS_TTL: 5 * 1000,
    SESSION_FINISH_TIMER: 60 * 1000,
    SESSION_SYNC_START_EMMITING_OFFSET: 7.5 * 1000,
    SESSION_SYNC_START_OFFSET: 10 * 1000,
    SESSION_UPDATE_RATE: 60
}

//Web socket per message deflate options (Adjusts may achieve better or worse
//network performace on game sessions)
//Defalte options control per message compression on the web socket
const webSocketPerMessageDeflateParams = {
    zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 6,
        level: 3
    },
    zlibInflateOptions: {
        chunkSize: 3 * 1024
    },
    clientNoContextTakeover: false,
    serverNoContextTakeover: false,
    clientMaxWindowBits: 10,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
};

module.exports = {
    ...sessionParameters,
    webSocketPerMessageDeflateParams
}
