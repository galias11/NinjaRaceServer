// @Model
const Level = require('../model/serverLevel');
const Player = require('../model/serverPlayer');

const SVA_01 = [
    new Level(1, 'mock1', 0.0, 0.0, 1),
    new Level(2, 'mock1', 0.0, 0.0, 1),
    new Level(3, 'mock1', 0.0, 0.0, 1),
    new Level(4, 'mock1', 0.0, 0.0, 1),
    new Level(5, 'mock1', 0.0, 0.0, 1),
    new Level(6, 'mock1', 0.0, 0.0, 1),
    new Level(7, 'mock1', 0.0, 0.0, 1),
    new Level(8, 'mock1', 0.0, 0.0, 1),
];

const SVA_02 = [

];

const SVA_03 = [
    new Level(1, 'mock1', 0.0, 0.0, 1),
];

const SVF_01 = [
    new Player(1, 'mail1@gmail.com'),
    new Player(4, 'mail2@gmail.com')
];

const SVF_02 = [

];

const SVF_03 = [
    new Player(1, 'mail1@gmail.com'),
    new Player(2, 'prueba.mail@gmail.com'),
    new Player(4, 'mail2@gmail.com')
];

const SVF_04 = [
    new Player(1, 'mail1@gmail.com')
];

const SVG_01 = [
    new Player(1, 'mail1@gmail.com'),
    new Player(4, 'mail4@gmail.com')
];

const SVG_02 = [
];

const SVG_03 = [
    new Player(4, 'mail4@gmail.com')
];

module.exports = {
    SVA_01,
    SVA_02,
    SVA_03,
    SVF_01,
    SVF_02,
    SVF_03,
    SVF_04,
    SVG_01,
    SVG_02,
    SVG_03
}