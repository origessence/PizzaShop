(function() {
  var CSON, PackageConverter, ScopeSelector, _, fs, path, plist, request, tar, temp, url, zlib;

  path = require('path');

  url = require('url');

  zlib = require('zlib');

  _ = require('underscore-plus');

  CSON = require('season');

  plist = require('plist');

  ({ScopeSelector} = require('first-mate'));

  tar = require('tar');

  temp = require('temp');

  fs = require('./fs');

  request = require('./request');

  // Convert a TextMate bundle to an Atom package
  module.exports = PackageConverter = class PackageConverter {
    constructor(sourcePath1, destinationPath) {
      this.sourcePath = sourcePath1;
      this.destinationPath = path.resolve(destinationPath);
      this.plistExtensions = ['.plist', '.tmCommand', '.tmLanguage', '.tmMacro', '.tmPreferences', '.tmSnippet'];
      this.directoryMappings = {
        'Preferences': 'settings',
        'Snippets': 'snippets',
        'Syntaxes': 'grammars'
      };
    }

    convert(callback) {
      var protocol;
      ({protocol} = url.parse(this.sourcePath));
      if (protocol === 'http:' || protocol === 'https:') {
        return this.downloadBundle(callback);
      } else {
        return this.copyDirectories(this.sourcePath, callback);
      }
    }

    getDownloadUrl() {
      var downloadUrl;
      downloadUrl = this.sourcePath;
      downloadUrl = downloadUrl.replace(/(\.git)?\/*$/, '');
      return downloadUrl += '/archive/master.tar.gz';
    }

    downloadBundle(callback) {
      var requestOptions, tempPath;
      tempPath = temp.mkdirSync('atom-bundle-');
      requestOptions = {
        url: this.getDownloadUrl()
      };
      return request.createReadStream(requestOptions, (readStream) => {
        readStream.on('response', function({headers, statusCode}) {
          if (statusCode !== 200) {
            return callback(`Download failed (${headers.status})`);
          }
        });
        return readStream.pipe(zlib.createGunzip()).pipe(tar.Extract({
          path: tempPath
        })).on('error', function(error) {
          return callback(error);
        }).on('end', () => {
          var sourcePath;
          sourcePath = path.join(tempPath, fs.readdirSync(tempPath)[0]);
          return this.copyDirectories(sourcePath, callback);
        });
      });
    }

    copyDirectories(sourcePath, callback) {
      var packageName, ref;
      sourcePath = path.resolve(sourcePath);
      try {
        packageName = (ref = JSON.parse(fs.readFileSync(path.join(sourcePath, 'package.json')))) != null ? ref.packageName : void 0;
      } catch (error1) {}
      if (packageName == null) {
        packageName = path.basename(this.destinationPath);
      }
      this.convertSnippets(packageName, sourcePath);
      this.convertPreferences(packageName, sourcePath);
      this.convertGrammars(sourcePath);
      return callback();
    }

    filterObject(object) {
      delete object.uuid;
      return delete object.keyEquivalent;
    }

    convertSettings(settings) {
      var editorProperties, i, len, name, ref, shellVariables, value;
      if (settings.shellVariables) {
        shellVariables = {};
        ref = settings.shellVariables;
        for (i = 0, len = ref.length; i < len; i++) {
          ({name, value} = ref[i]);
          shellVariables[name] = value;
        }
        settings.shellVariables = shellVariables;
      }
      editorProperties = _.compactObject({
        commentStart: _.valueForKeyPath(settings, 'shellVariables.TM_COMMENT_START'),
        commentEnd: _.valueForKeyPath(settings, 'shellVariables.TM_COMMENT_END'),
        increaseIndentPattern: settings.increaseIndentPattern,
        decreaseIndentPattern: settings.decreaseIndentPattern,
        foldEndPattern: settings.foldingStopMarker,
        completions: settings.completions
      });
      if (!_.isEmpty(editorProperties)) {
        return {
          editor: editorProperties
        };
      }
    }

    readFileSync(filePath) {
      if (_.contains(this.plistExtensions, path.extname(filePath))) {
        return plist.parseFileSync(filePath);
      } else if (_.contains(['.json', '.cson'], path.extname(filePath))) {
        return CSON.readFileSync(filePath);
      }
    }

    writeFileSync(filePath, object = {}) {
      this.filterObject(object);
      if (Object.keys(object).length > 0) {
        return CSON.writeFileSync(filePath, object);
      }
    }

    convertFile(sourcePath, destinationDir) {
      var contents, destinationName, destinationPath, extension;
      extension = path.extname(sourcePath);
      destinationName = `${path.basename(sourcePath, extension)}.cson`;
      destinationName = destinationName.toLowerCase();
      destinationPath = path.join(destinationDir, destinationName);
      if (_.contains(this.plistExtensions, path.extname(sourcePath))) {
        contents = plist.parseFileSync(sourcePath);
      } else if (_.contains(['.json', '.cson'], path.extname(sourcePath))) {
        contents = CSON.readFileSync(sourcePath);
      }
      return this.writeFileSync(destinationPath, contents);
    }

    normalizeFilenames(directoryPath) {
      var child, childPath, convertedFileName, convertedPath, extension, i, len, ref, results, suffix;
      if (!fs.isDirectorySync(directoryPath)) {
        return;
      }
      ref = fs.readdirSync(directoryPath);
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        childPath = path.join(directoryPath, child);
        // Invalid characters taken from http://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx
        convertedFileName = child.replace(/[|?*<>:"\\\/]+/g, '-');
        if (child === convertedFileName) {
          continue;
        }
        convertedFileName = convertedFileName.replace(/[\s-]+/g, '-');
        convertedPath = path.join(directoryPath, convertedFileName);
        suffix = 1;
        while (fs.existsSync(convertedPath) || fs.existsSync(convertedPath.toLowerCase())) {
          extension = path.extname(convertedFileName);
          convertedFileName = `${path.basename(convertedFileName, extension)}-${suffix}${extension}`;
          convertedPath = path.join(directoryPath, convertedFileName);
          suffix++;
        }
        results.push(fs.renameSync(childPath, convertedPath));
      }
      return results;
    }

    convertSnippets(packageName, source) {
      var child, content, destination, e, extension, i, len, name, ref, ref1, scope, selector, snippet, snippetsBySelector, sourceSnippets, tabTrigger;
      sourceSnippets = path.join(source, 'snippets');
      if (!fs.isDirectorySync(sourceSnippets)) {
        sourceSnippets = path.join(source, 'Snippets');
      }
      if (!fs.isDirectorySync(sourceSnippets)) {
        return;
      }
      snippetsBySelector = {};
      destination = path.join(this.destinationPath, 'snippets');
      ref = fs.readdirSync(sourceSnippets);
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        snippet = (ref1 = this.readFileSync(path.join(sourceSnippets, child))) != null ? ref1 : {};
        ({scope, name, content, tabTrigger} = snippet);
        if (!(tabTrigger && content)) {
          continue;
        }
        // Replace things like '${TM_C_POINTER: *}' with ' *'
        content = content.replace(/\$\{TM_[A-Z_]+:([^}]+)}/g, '$1');
        // Replace things like '${1:${TM_FILENAME/(\\w+)*/(?1:$1:NSObject)/}}'
        // with '$1'
        content = content.replace(/\$\{(\d)+:\s*\$\{TM_[^}]+\s*\}\s*\}/g, '$$1');
        // Unescape escaped dollar signs $
        content = content.replace(/\\\$/g, '$');
        if (name == null) {
          extension = path.extname(child);
          name = path.basename(child, extension);
        }
        try {
          if (scope) {
            selector = new ScopeSelector(scope).toCssSelector();
          }
        } catch (error1) {
          e = error1;
          e.message = `In file ${e.fileName} at ${JSON.stringify(scope)}: ${e.message}`;
          throw e;
        }
        if (selector == null) {
          selector = '*';
        }
        if (snippetsBySelector[selector] == null) {
          snippetsBySelector[selector] = {};
        }
        snippetsBySelector[selector][name] = {
          prefix: tabTrigger,
          body: content
        };
      }
      this.writeFileSync(path.join(destination, `${packageName}.cson`), snippetsBySelector);
      return this.normalizeFilenames(destination);
    }

    convertPreferences(packageName, source) {
      var child, destination, e, i, key, len, preferencesBySelector, properties, ref, ref1, scope, selector, settings, sourcePreferences, value;
      sourcePreferences = path.join(source, 'preferences');
      if (!fs.isDirectorySync(sourcePreferences)) {
        sourcePreferences = path.join(source, 'Preferences');
      }
      if (!fs.isDirectorySync(sourcePreferences)) {
        return;
      }
      preferencesBySelector = {};
      destination = path.join(this.destinationPath, 'settings');
      ref = fs.readdirSync(sourcePreferences);
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        ({scope, settings} = (ref1 = this.readFileSync(path.join(sourcePreferences, child))) != null ? ref1 : {});
        if (!(scope && settings)) {
          continue;
        }
        if (properties = this.convertSettings(settings)) {
          try {
            selector = new ScopeSelector(scope).toCssSelector();
          } catch (error1) {
            e = error1;
            e.message = `In file ${e.fileName} at ${JSON.stringify(scope)}: ${e.message}`;
            throw e;
          }
          for (key in properties) {
            value = properties[key];
            if (preferencesBySelector[selector] == null) {
              preferencesBySelector[selector] = {};
            }
            if (preferencesBySelector[selector][key] != null) {
              preferencesBySelector[selector][key] = _.extend(value, preferencesBySelector[selector][key]);
            } else {
              preferencesBySelector[selector][key] = value;
            }
          }
        }
      }
      this.writeFileSync(path.join(destination, `${packageName}.cson`), preferencesBySelector);
      return this.normalizeFilenames(destination);
    }

    convertGrammars(source) {
      var child, childPath, destination, i, len, ref, sourceSyntaxes;
      sourceSyntaxes = path.join(source, 'syntaxes');
      if (!fs.isDirectorySync(sourceSyntaxes)) {
        sourceSyntaxes = path.join(source, 'Syntaxes');
      }
      if (!fs.isDirectorySync(sourceSyntaxes)) {
        return;
      }
      destination = path.join(this.destinationPath, 'grammars');
      ref = fs.readdirSync(sourceSyntaxes);
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        childPath = path.join(sourceSyntaxes, child);
        if (fs.isFileSync(childPath)) {
          this.convertFile(childPath, destination);
        }
      }
      return this.normalizeFilenames(destination);
    }

  };

}).call(this);
