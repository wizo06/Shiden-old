// Import node modules
// const path = require('path');
const { exec } = require('child_process');
const request = require('request');

// Import custom modules
// const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));

module.exports = Promisefied = {
  exec: (command, options) => {
    return new Promise((resolve, reject) => {
      let stdoutMessage = '';
      let errMessage = '';
      // Logger.debug(`Running command ${command}`);
      subprocess = exec(command, options);
      subprocess.stdout.on('data', data => stdoutMessage += data);
      subprocess.stderr.on('data', data => errMessage += data);
      subprocess.on('close', code => {
        if (code === 0) resolve(stdoutMessage);
        else reject(errMessage);
      });
    });
  },

  request: options => {
    return new Promise((resolve, reject) => {
      request(options, (err, res, body) => {
        if (err) reject(err);
        else resolve({ res, body });
      });
    });
  },

};
