module.exports = {
    "extends": ["eslint:recommended"],
    "env": {
      "node": true,
      "es6": true
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
        "no-console": 0,
        "indent": [
            "error",
            4,
            {
              "SwitchCase": 1,
              "CallExpression": {
                "arguments": "off"
              }
            }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ]
    }
};
