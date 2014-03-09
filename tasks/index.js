module.exports = function (grunt) {
  'use strict';

  var
    path = require('path'),
    mochaPath = require.resolve('mocha/bin/_mocha'),
    istanbulPath = require.resolve('istanbul/lib/cli');

  grunt.registerMultiTask('mocha_istanbul', 'Generate coverage report with Istanbul from mocha test', function () {
    if (!this.filesSrc.length || !grunt.file.isDir(this.filesSrc[0])) {
      grunt.fail.fatal('Missing src attribute with the folder with tests');
      return;
    }

    var
      options = this.options({
        require: [],
        ui: false,
        globals: [],
        reporter: false,
        timeout: false,
        coverage: false,
        slow: false,
        grep: false,
        dryRun: false,
        quiet: false,
        recursive: false,
        mask: false,
        root: false,
        coverageFolder: 'coverage',
        reportFormats: ['lcov'],
        check: {
          statements: false,
          lines: false,
          functions: false,
          branches: false
        }
      }),
      coverageFolder = path.join(process.cwd(), options.coverageFolder),
      rootFolderForCoverage = options.root ? path.join(process.cwd(), options.root) : '.',
      done = this.async(),
      cmd = 'node',
      args = [];

    function executeCheck(callback){
      var args = [], check = options.check;

      if (
        check.statements !== false ||
          check.lines !== false ||
          check.functions !== false ||
          check.branches !== false
        ) {
        args.push(istanbulPath);
        args.push('check-coverage');
        if (check.lines) {
          args.push('--lines');
          args.push(check.lines);
        }
        if (check.statements) {
          args.push('--statements');
          args.push(check.statements);
        }
        if (check.functions) {
          args.push('--functions');
          args.push(check.functions);
        }
        if (check.branches) {
          args.push('--branches');
          args.push(check.branches);
        }

        args.push('--dir=' + coverageFolder);

        grunt.verbose.ok('Will execute: ', 'node ' + args.join(' '));

        if (!options.dryRun) {
          grunt.util.spawn({
            cmd: cmd,
            args: args,
            opts: {
              env: process.env,
              cwd: process.cwd(),
              stdio: options.quiet ? 'ignore' : 'inherit'
            }
          }, function (err) {
            if (err) {
              callback && callback(err);
              return;
            }
            callback && callback(null, 'Done. Minimum coverage threshold succeeded.');
          });

          return;
        } else {
          callback && callback(null, 'Would also execute post cover: node ' + args.join(' '));
          return;
        }
      }

      callback && callback();
    }


    args.push(istanbulPath);              // node ./node_modules/istanbul/lib/cli.js
    args.push('--dir=' + coverageFolder); // node ./node_modules/istanbul/cli.js --dir=coverage
    if (options.root) {
      args.push('--root=' + rootFolderForCoverage);
    }

    options.reportFormats.forEach(function(format){
      args.push('--report=' + format);
    });

    args.push('cover');                   // node ./node_modules/istanbul/lib/cli.js cover
    args.push(mochaPath);                 // node ./node_modules/istanbul/lib/cli.js cover ./node_modules/mocha/bin/_mocha
    args.push('--');                      // node ./node_modules/istanbul/lib/cli.js cover ./node_modules/mocha/bin/_mocha --

    if (grunt.file.exists(path.join(process.cwd(), this.filesSrc[0], 'mocha.opts'))) {
      if (
          options.require.length ||
          options.globals.length ||
          options.ui ||
          options.reporter ||
          options.timeout ||
          options.slow ||
          options.grep ||
          options.mask
        ) {
        grunt.log.error('Warning: mocha.opts exists, but overwriting with options');
      }
    }

    if (options.timeout) {
      args.push('--timeout');
      args.push(options.timeout);
    }

    if (options.require) {
      options.require.forEach(function (require) {
        args.push('--require');
        args.push(require);
      });
    }
    if (options.ui) {
      args.push('--ui');
      args.push(options.ui);
    }
    if (options.reporter) {
      args.push('--reporter');
      args.push(options.reporter);
    }

    if (options.globals.length) {
      args.push('--globals');
      args.push(options.globals.join(','));
    }
    if (options.slow) {
      args.push('--slow');
      args.push(options.slow);
    }
    if (options.grep) {
      args.push('--grep');
      args.push(options.grep);
    }

    if (options.recursive) {
      args.push('--recursive');
    }

    var masked = this.filesSrc[0];

    if (options.mask) {
      masked = path.join(this.filesSrc[0], options.mask);
    }

    args.push(masked);

    grunt.verbose.ok('Will execute:', 'node ' + args.join(' '));

    if (!options.dryRun) {
      grunt.util.spawn({
        cmd: cmd,
        args: args,
        opts: {
          env: process.env,
          cwd: process.cwd(),
          stdio: options.quiet ? 'ignore' : 'inherit'
        }
      }, function (err, result) {
        if (err) {
          grunt.log.error(result);
          done(false);
          return;
        }

        executeCheck(function(err, result){
          if (!err) {
            if (options.coverage) {
              var coverage = grunt.file.read(path.join(coverageFolder, 'lcov.info'));
              grunt.event.emit('coverage', coverage, function(d){
                grunt.log.ok(result || 'Done. Check coverage folder.');
                done(d);
              });
            } else {
              grunt.log.ok(result || 'Done. Check coverage folder.');
              done();
            }
          } else {
            done(err);
          }
        });
      });
    } else {
      executeCheck(function(err, would){
        grunt.log.ok('Would execute:', 'node ' + args.join(' '));
        would && grunt.log.ok(would);
      });

      done();
    }

  });
};
