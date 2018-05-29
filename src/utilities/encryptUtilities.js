// @Vendor
const passwordHash = require('password-hash'); //@npm:password-hash MIT license
const Tokens = require('csrf'); //@npm:crsf MIT license

const csrf = new Tokens();

const cryptPassword = (password) => {
    return passwordHash.generate(password);
};

const comparePassword = (password, hashedPassword) => {
    return passwordHash.verify(password, hashedPassword);
};

const generateToken = () => {
    const secret = csrf.secretSync();
    const token = csrf.create(secret);
    return {
        token: token,
        secret: secret
    };
};

function validateToken(token, secret) {
    return csrf.verify(secret, token);
}

module.exports = {
    cryptPassword,
    comparePassword,
    generateToken,
    validateToken
};
