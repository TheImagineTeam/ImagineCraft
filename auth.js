const mcapi = require("minecraft-client");

module.exports = {
  login: function login(username, password) {
    return mcapi.Authentication.login(username, password);
  },
};
