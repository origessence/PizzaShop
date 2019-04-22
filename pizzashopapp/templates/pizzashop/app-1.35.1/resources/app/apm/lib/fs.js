(function() {
  var _, fs, fsAdditions, ncp, path, rm, wrench;

  _ = require('underscore-plus');

  fs = require('fs-plus');

  ncp = require('ncp');

  rm = require('rimraf');

  wrench = require('wrench');

  path = require('path');

  fsAdditions = {
    list: function(directoryPath) {
      var e;
      if (fs.isDirectorySync(directoryPath)) {
        try {
          return fs.readdirSync(directoryPath);
        } catch (error1) {
          e = error1;
          return [];
        }
      } else {
        return [];
      }
    },
    listRecursive: function(directoryPath) {
      return wrench.readdirSyncRecursive(directoryPath);
    },
    cp: function(sourcePath, destinationPath, callback) {
      return rm(destinationPath, function(error) {
        if (error != null) {
          return callback(error);
        } else {
          return ncp(sourcePath, destinationPath, callback);
        }
      });
    },
    mv: function(sourcePath, destinationPath, callback) {
      return rm(destinationPath, function(error) {
        if (error != null) {
          return callback(error);
        } else {
          wrench.mkdirSyncRecursive(path.dirname(destinationPath), 0o755);
          return fs.rename(sourcePath, destinationPath, callback);
        }
      });
    }
  };

  module.exports = new Proxy({}, {
    get: function(target, key) {
      return fsAdditions[key] || fs[key];
    },
    set: function(target, key, value) {
      return fsAdditions[key] = value;
    }
  });

}).call(this);
