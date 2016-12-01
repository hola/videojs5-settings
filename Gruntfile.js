'use strict';

module.exports = function(grunt) {
  let pkg = grunt.file.readJSON('package.json');
  let version = pkg.version;

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      js: {
        files: ['src/*.js', 'Gruntfile.js'],
        tasks: ['jshint']
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: ['src/*.js']
    },
    less: {
      options: {
        paths: ['src/', 'node_modules/@hola.org/videojs-hola-skin/src/css/']
      },
      all: {
        files: [
          {nonull: true, dest: 'dist/videojs-settings.css', src: ['src/*.less']}
        ]
      }
    },
    browserify: {
      options: {
        plugin: [
          ['browserify-derequire']
        ]
      },
      dist: {
        files: {
          'dist/videojs-settings.js': ['src/videojs-settings.js']
        }
      }
    },
    uglify : {
      all : {
        files: {
          'dist/videojs-settings.min.js' : [
            'dist/videojs-settings.js'
          ]
        }
      }
    }
  });

  // Load Grunt tasks.
  require('load-grunt-tasks')(grunt);

  grunt.registerTask('build', ['jshint', 'less', 'browserify', 'uglify']);
  // Default task.
  grunt.registerTask('default', ['build']);
};
