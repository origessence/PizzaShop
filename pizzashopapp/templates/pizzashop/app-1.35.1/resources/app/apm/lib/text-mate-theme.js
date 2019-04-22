(function() {
  var ScopeSelector, SyntaxVariablesTemplate, TextMateTheme, _, plist;

  _ = require('underscore-plus');

  plist = require('plist');

  ({ScopeSelector} = require('first-mate'));

  module.exports = TextMateTheme = class TextMateTheme {
    constructor(contents) {
      this.contents = contents;
      this.rulesets = [];
      this.buildRulesets();
    }

    buildRulesets() {
      var background, caret, foreground, i, invisibles, len, lineHighlight, name, ref, scope, selection, setting, settings, variableSettings;
      ({settings} = (ref = plist.parseStringSync(this.contents)) != null ? ref : {});
      if (settings == null) {
        settings = [];
      }
      for (i = 0, len = settings.length; i < len; i++) {
        setting = settings[i];
        ({scope, name} = setting.settings);
        if (scope || name) {
          continue;
        }
        // Require all of these or invalid LESS will be generated if any required
        // variable value is missing
        ({background, foreground, caret, selection, invisibles, lineHighlight} = setting.settings);
        if (background && foreground && caret && selection && lineHighlight && invisibles) {
          variableSettings = setting.settings;
          break;
        }
      }
      if (variableSettings == null) {
        throw new Error("Could not find the required color settings in the theme.\n\nThe theme being converted must contain a settings array with all of the following keys:\n  * background\n  * caret\n  * foreground\n  * invisibles\n  * lineHighlight\n  * selection");
      }
      this.buildSyntaxVariables(variableSettings);
      this.buildGlobalSettingsRulesets(variableSettings);
      return this.buildScopeSelectorRulesets(settings);
    }

    getStylesheet() {
      var i, len, lines, name, properties, ref, selector, value;
      lines = ['@import "syntax-variables";', ''];
      ref = this.getRulesets();
      for (i = 0, len = ref.length; i < len; i++) {
        ({selector, properties} = ref[i]);
        lines.push(`${selector} {`);
        for (name in properties) {
          value = properties[name];
          lines.push(`  ${name}: ${value};`);
        }
        lines.push("}\n");
      }
      return lines.join('\n');
    }

    getRulesets() {
      return this.rulesets;
    }

    getSyntaxVariables() {
      return this.syntaxVariables;
    }

    buildSyntaxVariables(settings) {
      var key, replaceRegex, value;
      this.syntaxVariables = SyntaxVariablesTemplate;
      for (key in settings) {
        value = settings[key];
        replaceRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        this.syntaxVariables = this.syntaxVariables.replace(replaceRegex, this.translateColor(value));
      }
      return this.syntaxVariables;
    }

    buildGlobalSettingsRulesets(settings) {
      this.rulesets.push({
        selector: 'atom-text-editor',
        properties: {
          'background-color': '@syntax-background-color',
          'color': '@syntax-text-color'
        }
      });
      this.rulesets.push({
        selector: 'atom-text-editor .gutter',
        properties: {
          'background-color': '@syntax-gutter-background-color',
          'color': '@syntax-gutter-text-color'
        }
      });
      this.rulesets.push({
        selector: 'atom-text-editor .gutter .line-number.cursor-line',
        properties: {
          'background-color': '@syntax-gutter-background-color-selected',
          'color': '@syntax-gutter-text-color-selected'
        }
      });
      this.rulesets.push({
        selector: 'atom-text-editor .gutter .line-number.cursor-line-no-selection',
        properties: {
          'color': '@syntax-gutter-text-color-selected'
        }
      });
      this.rulesets.push({
        selector: 'atom-text-editor .wrap-guide',
        properties: {
          'color': '@syntax-wrap-guide-color'
        }
      });
      this.rulesets.push({
        selector: 'atom-text-editor .indent-guide',
        properties: {
          'color': '@syntax-indent-guide-color'
        }
      });
      this.rulesets.push({
        selector: 'atom-text-editor .invisible-character',
        properties: {
          'color': '@syntax-invisible-character-color'
        }
      });
      this.rulesets.push({
        selector: 'atom-text-editor.is-focused .cursor',
        properties: {
          'border-color': '@syntax-cursor-color'
        }
      });
      this.rulesets.push({
        selector: 'atom-text-editor.is-focused .selection .region',
        properties: {
          'background-color': '@syntax-selection-color'
        }
      });
      return this.rulesets.push({
        selector: 'atom-text-editor.is-focused .line-number.cursor-line-no-selection, atom-text-editor.is-focused .line.cursor-line',
        properties: {
          'background-color': this.translateColor(settings.lineHighlight)
        }
      });
    }

    buildScopeSelectorRulesets(scopeSelectorSettings) {
      var i, len, name, results, scope, settings;
      results = [];
      for (i = 0, len = scopeSelectorSettings.length; i < len; i++) {
        ({name, scope, settings} = scopeSelectorSettings[i]);
        if (!scope) {
          continue;
        }
        results.push(this.rulesets.push({
          comment: name,
          selector: this.translateScopeSelector(scope),
          properties: this.translateScopeSelectorSettings(settings)
        }));
      }
      return results;
    }

    translateScopeSelector(textmateScopeSelector) {
      return new ScopeSelector(textmateScopeSelector).toCssSyntaxSelector();
    }

    translateScopeSelectorSettings({foreground, background, fontStyle}) {
      var fontStyles, properties;
      properties = {};
      if (fontStyle) {
        fontStyles = fontStyle.split(/\s+/);
        if (_.contains(fontStyles, 'bold')) {
          properties['font-weight'] = 'bold';
        }
        if (_.contains(fontStyles, 'italic')) {
          properties['font-style'] = 'italic';
        }
        if (_.contains(fontStyles, 'underline')) {
          properties['text-decoration'] = 'underline';
        }
      }
      if (foreground) {
        properties['color'] = this.translateColor(foreground);
      }
      if (background) {
        properties['background-color'] = this.translateColor(background);
      }
      return properties;
    }

    translateColor(textmateColor) {
      var a, b, g, r;
      textmateColor = `#${textmateColor.replace(/^#+/, '')}`;
      if (textmateColor.length <= 7) {
        return textmateColor;
      } else {
        r = this.parseHexColor(textmateColor.slice(1, 3));
        g = this.parseHexColor(textmateColor.slice(3, 5));
        b = this.parseHexColor(textmateColor.slice(5, 7));
        a = this.parseHexColor(textmateColor.slice(7, 9));
        a = Math.round((a / 255.0) * 100) / 100;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
    }

    parseHexColor(color) {
      var parsed;
      parsed = Math.min(255, Math.max(0, parseInt(color, 16)));
      if (isNaN(parsed)) {
        return 0;
      } else {
        return parsed;
      }
    }

  };

  SyntaxVariablesTemplate = "// This defines all syntax variables that syntax themes must implement when they\n// include a syntax-variables.less file.\n\n// General colors\n@syntax-text-color: {{foreground}};\n@syntax-cursor-color: {{caret}};\n@syntax-selection-color: {{selection}};\n@syntax-background-color: {{background}};\n\n// Guide colors\n@syntax-wrap-guide-color: {{invisibles}};\n@syntax-indent-guide-color: {{invisibles}};\n@syntax-invisible-character-color: {{invisibles}};\n\n// For find and replace markers\n@syntax-result-marker-color: {{invisibles}};\n@syntax-result-marker-color-selected: {{foreground}};\n\n// Gutter colors\n@syntax-gutter-text-color: {{foreground}};\n@syntax-gutter-text-color-selected: {{foreground}};\n@syntax-gutter-background-color: {{background}};\n@syntax-gutter-background-color-selected: {{lineHighlight}};\n\n// For git diff info. i.e. in the gutter\n// These are static and were not extracted from your textmate theme\n@syntax-color-renamed: #96CBFE;\n@syntax-color-added: #A8FF60;\n@syntax-color-modified: #E9C062;\n@syntax-color-removed: #CC6666;";

}).call(this);
