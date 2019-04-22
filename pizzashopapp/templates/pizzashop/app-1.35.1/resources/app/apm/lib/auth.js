(function() {
  var error, keytar, tokenName;

  try {
    keytar = require('keytar');
  } catch (error1) {
    error = error1;
    // Gracefully handle keytar failing to load due to missing library on Linux
    if (process.platform === 'linux') {
      keytar = {
        findPassword: function() {
          return Promise.reject();
        },
        setPassword: function() {
          return Promise.reject();
        }
      };
    } else {
      throw error;
    }
  }

  tokenName = 'Atom.io API Token';

  module.exports = {
    // Get the Atom.io API token from the keychain.

    // callback - A function to call with an error as the first argument and a
    //            string token as the second argument.
    getToken: function(callback) {
      return keytar.findPassword(tokenName).then(function(token) {
        if (token) {
          return callback(null, token);
        } else {
          return Promise.reject();
        }
      }).catch(function() {
        var token;
        if (token = process.env.ATOM_ACCESS_TOKEN) {
          return callback(null, token);
        } else {
          return callback("No Atom.io API token in keychain\nRun `apm login` or set the `ATOM_ACCESS_TOKEN` environment variable.");
        }
      });
    },
    // Save the given token to the keychain.

    // token - A string token to save.
    saveToken: function(token) {
      return keytar.setPassword(tokenName, 'atom.io', token);
    }
  };

}).call(this);
