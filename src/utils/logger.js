/**
 * @module logger
 * This module simply prepend a timestamp and filename to console.log()
 */

// Import node modules
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// master will be set to TRUE if current git branch name is 'master'
const master = ('master' === fs.readFileSync(path.join(process.cwd(), '.git/HEAD'), { encoding: 'utf8' }).match(/ref: refs\/heads\/([^\n]+)/)[1]);

const verbosity = process.argv.slice(2).includes('--quiet');

module.exports = Logger = {
  Colors: {
    Reset: '\x1b[0m',
    Bright: '\x1b[1m',
    Dim: '\x1b[2m',
    Underscore: '\x1b[4m',
    Blink: '\x1b[5m',
    Reverse: '\x1b[7m',
    Hidden: '\x1b[8m',

    FgBlack: '\x1b[30m',
    FgRed: '\x1b[31m',
    FgGreen: '\x1b[32m',
    FgYellow: '\x1b[33m',
    FgBlue: '\x1b[34m',
    FgMagenta: '\x1b[35m',
    FgCyan: '\x1b[36m',
    FgWhite: '\x1b[37m',
  },

  getCallingDetails: () => {
    const err = new Error();
    const frame = err.stack.split('\n')[3];

    // filename (no row, no clumn)
    // const filename = path.basename(frame).split(':')[0];

    // filename:row:column
    // const filename = path.basename(frame).replace(')', '');

    // /absolute/path/from/project/file:row:column
    const filename = frame.trimLeft().split(' ')[2].replace(process.cwd(), '').replace(/\(|\)/g, '');

    // const functionName = frame.split(' ')[5];
    // return `${filename}:${functionName.startsWith('/') ? '' : functionName}`;
    return filename;
  },

  info: (data, color = '') => {
    console.log(`[${moment().format('ddd|MMMDD|HH:mm:ss|Z')}][INFO]: ${color}[${Logger.getCallingDetails()}]: ${data}${Logger.Colors.Reset}`);
  },

  debug: (data, color = Logger.Colors.FgYellow) => {
    (master || verbosity) ? '' :
      console.log(`[${moment().format('ddd|MMMDD|HH:mm:ss|Z')}][DEBUG]: ${color}[${Logger.getCallingDetails()}]: ${data}${Logger.Colors.Reset}`);
  },

  warning: (data, color = Logger.Colors.Bright + Logger.Colors.FgYellow) => {
    console.log(`[${moment().format('ddd|MMMDD|HH:mm:ss|Z')}][WARNING]: ${color}[${Logger.getCallingDetails()}]: ${data}${Logger.Colors.Reset}`);
  },

  error: (data, color = Logger.Colors.FgRed) => {
    console.log(`[${moment().format('ddd|MMMDD|HH:mm:ss|Z')}][ERROR]: ${color}[${Logger.getCallingDetails()}]: ${data}${Logger.Colors.Reset}`);
  },

  critical: (data, color = Logger.Colors.Bright + Logger.Colors.FgRed) => {
    console.log(`[${moment().format('ddd|MMMDD|HH:mm:ss|Z')}][CRITICAL]: ${color}[${Logger.getCallingDetails()}]: ${data}${Logger.Colors.Reset}`);
  },

};
