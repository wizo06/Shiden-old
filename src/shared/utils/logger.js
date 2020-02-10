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

    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },

  getCallingDetails: () => {
    const err = new Error();
    const frame = err.stack.split('\n')[3];

    // filename (no row, no clumn)
    // const filename = path.basename(frame).split(':')[0];

    // filename:row
    const filename = path.basename(frame).replace(')', '').split(':').slice(0, 2).join(':');

    // /absolute/path/from/project/file:row:column
    // const filename = frame.trimLeft().split(' ')[2].replace(process.cwd(), '').replace(/\(|\)/g, '');

    // const functionName = frame.split(' ')[5];
    // return `${filename}:${functionName.startsWith('/') ? '' : functionName}`;
    return filename;
  },

  success: (data, color = '') => {
    const timestamp = moment().format('MMMDD|HH:mm:ss');
    const iconColor = Logger.Colors.Bright + Logger.Colors.green;
    console.log(`[${timestamp}][SUCCESS]: [${Logger.getCallingDetails()}]:${iconColor}✔ ${Logger.Colors.Reset}${color}${data}${Logger.Colors.Reset}`);
  },

  info: (data, color = '') => {
    const timestamp = moment().format('MMMDD|HH:mm:ss');
    const iconColor = Logger.Colors.Bright + Logger.Colors.cyan;
    console.log(`[${timestamp}][INFO]: [${Logger.getCallingDetails()}]:${iconColor}i ${Logger.Colors.Reset}${color}${data}${Logger.Colors.Reset}`);
  },

  debug: (data, color = '') => {
    const timestamp = moment().format('MMMDD|HH:mm:ss');
    const iconColor = Logger.Colors.Bright + Logger.Colors.yellow;
    (master || verbosity) ? '' :
      console.log(`[${timestamp}][DEBUG]: [${Logger.getCallingDetails()}]:${iconColor}! ${Logger.Colors.Reset}${color}${data}${Logger.Colors.Reset}`);
  },

  warning: (data, color = '') => {
    const timestamp = moment().format('MMMDD|HH:mm:ss');
    const iconColor = Logger.Colors.Bright + Logger.Colors.yellow;
    console.log(`[${timestamp}][WARNING]: [${Logger.getCallingDetails()}]:${iconColor}⚠ ${Logger.Colors.Reset}${Logger.Colors.Bright}${color}${data}${Logger.Colors.Reset}`);
  },

  error: (data, color = '') => {
    const timestamp = moment().format('MMMDD|HH:mm:ss');
    const iconColor = Logger.Colors.Bright + Logger.Colors.red;
    console.log(`[${timestamp}][ERROR]: [${Logger.getCallingDetails()}]:${iconColor}✖ ${Logger.Colors.Reset}${color}${data}${Logger.Colors.Reset}`);
  },

  critical: (data, color = '') => {
    const timestamp = moment().format('MMMDD|HH:mm:ss');
    const iconColor = Logger.Colors.Bright + Logger.Colors.red;
    console.log(`[${timestamp}][CRITICAL]: [${Logger.getCallingDetails()}]:${iconColor}✖ ${Logger.Colors.Reset}${Logger.Colors.Bright}${color}${data}${Logger.Colors.Reset}`);
  },

};
