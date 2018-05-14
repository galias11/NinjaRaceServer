SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `levels` (
	`levelId` int(4) NOT NULL PRIMARY KEY,
	`clientFileRef` CHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `players` (
	`id` int(10) NOT NULL auto_increment PRIMARY KEY,
    `email` VARCHAR(100) NOT NULL,
	`pword` CHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `records` (
	`id` int(10) NOT NULL auto_increment PRIMARY KEY,
    `levelId` int(4) NOT NULL,
    `playerId` int(10) NOT NULL,
    `time` DOUBLE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `avatars` (
	`id` int(10) NOT NULL auto_increment PRIMARY KEY,
    `clientFileRef` CHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `levels` VALUES 
(1, 'testlvl1.scn'),
(2, 'testlvl2.scn'),
(3, 'testlvl3.scn'),
(4, 'testlvl4.scn'),
(5, 'testlvl5.scn'),
(6, 'testlvl6.scn'),
(7, 'testlvl7.scn'),
(8, 'testlvl8.scn');

INSERT INTO `avatars` VALUES 
(1, 'avatar1.png'),
(2, 'avatar2.png'),
(3, 'avatar3.png'),
(4, 'avatar4.png'),
(5, 'avatar5.png'),
(6, 'avatar6.png');
