// @Utilities
const {
    cryptPassword
} = require('../utilities');

const defaultPassword = 'prueba123';

const RESET = `
    SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
    SET time_zone = "+00:00";
    SET SQL_SAFE_UPDATES = 0;

    DROP TABLE IF EXISTS \`player\`;
    DROP TABLE IF EXISTS \`level\`;
    DROP TABLE IF EXISTS \`avatar\`;
    DROP TABLE IF EXISTS \`record\`;

    CREATE TABLE IF NOT EXISTS \`level\` (
        \`levelId\` int(4) NOT NULL PRIMARY KEY,
	    \`clientFileRef\` CHAR(20) NOT NULL,
	    \`startingPosX\` double NOT NULL,
	    \`startingPosY\` double NOT NULL,
	    \`startingDirectionId\` int(2) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

    CREATE TABLE IF NOT EXISTS \`player\` (
        \`id\` int(10) NOT NULL auto_increment PRIMARY KEY,
        \`email\` VARCHAR(100) NOT NULL,
        \`pword\` CHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

    CREATE TABLE IF NOT EXISTS \`record\` (
	    \`id\` int(10) NOT NULL auto_increment PRIMARY KEY,
        \`levelId\` int(4) NOT NULL,
        \`playerId\` int(10) NOT NULL,
        \`time\` DOUBLE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

    CREATE TABLE IF NOT EXISTS \`avatar\` (
        \`id\` int(10) NOT NULL auto_increment PRIMARY KEY,
        \`clientFileRef\` CHAR(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

    INSERT INTO \`level\` VALUES 
    (1, 'testlvl1.scn', 1.0, 1.0, 1),
    (2, 'testlvl2.scn', 1.0, 1.0, 1),
    (3, 'testlvl3.scn', 1.0, 1.0, 1),
    (4, 'testlvl4.scn', 1.0, 1.0, 1),
    (5, 'testlvl5.scn', 1.0, 1.0, 1),
    (6, 'testlvl6.scn', 1.0, 1.0, 1),
    (7, 'testlvl7.scn', 1.0, 1.0, 1),
    (8, 'testlvl8.scn', 1.0, 1.0, 1);

    INSERT INTO \`avatar\` VALUES 
    (1, 'avatar1.png'),
    (2, 'avatar2.png'),
    (3, 'avatar3.png'),
    (4, 'avatar4.png'),
    (5, 'avatar5.png'),
    (6, 'avatar6.png');
`;

const DBF_01 = `
    SET SQL_SAFE_UPDATES = 0;
    delete from player;
    insert into player (email, pword) values 
	    ('mail1@gmail.com', '${cryptPassword(defaultPassword)}'),
        ('prueba.mail@gmail.com', '${cryptPassword(defaultPassword)}'),
	    ('mail2@gmail.com', '${cryptPassword(defaultPassword)}');
`;

const DBF_02 = `
    SET SQL_SAFE_UPDATES = 0;
    delete from player;
`;

const DBF_03 = `
    SET SQL_SAFE_UPDATES = 0;
    delete from player;
    insert into player (email, pword) values 
	    ('mail1@gmail.com', '${cryptPassword(defaultPassword)}');
`;

const DBH_01 = `
    SET SQL_SAFE_UPDATES = 0;
    delete from player;
    insert into player (email, pword) values 
	    ('mail1@gmail.com', '${cryptPassword(defaultPassword)}'),
	    ('mail2@gmail.com', '${cryptPassword(defaultPassword)}');  
`;

const DBH_02 = `
    SET SQL_SAFE_UPDATES = 0;
    delete from player;    
`;

const DBH_03 = `
    SET SQL_SAFE_UPDATES = 0;
    delete from player;
    insert into player (email, pword) values 
	    ('mail1@gmail.com', '${cryptPassword(defaultPassword)}');
`;

module.exports = {
    DBF_01,
    DBF_02,
    DBF_03,
    DBH_01,
    DBH_02,
    DBH_03,
    RESET
};

