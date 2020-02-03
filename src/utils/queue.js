// Import node modules
const fs = require('fs');
const path = require('path');
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Paths = require(path.join(process.cwd(), 'src/utils/paths.js'));

module.exports = Queue = {
  getFilePath: () => {
    return new Promise(async (resolve, reject) => {
      if (fs.existsSync(Paths.queueFile)) resolve(Paths.queueFile);
      else reject(Paths.queueFile);
    });
  },

  readFile: queueFilePath => {
    const data = fs.readFileSync(queueFilePath, { encoding: 'utf8' });
    return JSON.parse(data);
  },

  writeFile: (queueFilePath, data) => {
    fs.writeFileSync(queueFilePath, JSON.stringify(data), { encoding: 'utf8' });
  },

  includes: payload => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        const filtered = queue.filter(queueItem => queueItem.full_path === payload.full_path)[0];
        if (filtered) {
          Logger.info(`New request denied: ${payload.full_path} is in queue already`);
          resolve(true);
        }
        else {
          Logger.info(`New request accepted`, Logger.Colors.Bright + Logger.Colors.FgGreen);
          resolve(false);
        }
      }
      catch (e) {
        Logger.debug('Queue file does not exist. Incoming payload is not a duplicate.');
        Logger.info(`New request accepted`, Logger.Colors.Bright + Logger.Colors.FgGreen);
        resolve(false);
      }
    });
  },

  push: payload => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        queue.push(payload);
        Logger.info(`Queueing payload`);
        Queue.writeFile(queueFilePath, queue);
        resolve();
      }
      catch (queueFilePath) {
        // Logger.debug('Queue file does not exist. Write to file without reading first.');
        const queue = [payload];
        Logger.info(`Queueing payload`);
        Queue.writeFile(queueFilePath, queue);
        resolve();
      }
    });
  },

  getFirst: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        resolve(queue[0]);
      }
      catch (e) {
        Logger.error(`Queue file does not exist.`);
        reject();
      }
    });
  },

  shift: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        queue.shift();
        Logger.debug(`Removing payload from queue`);
        Queue.writeFile(queueFilePath, queue);
        resolve();
      }
      catch (e) {
        Logger.error(`Queue file does not exist.`);
        reject();
      }
    });
  },

  isEmpty: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        if (queue.length) {
          // Logger.debug(`Queue still has payloads`)
          resolve(false);
        }
        else {
          // Logger.debug(`Queue is empty`)
          resolve(true);
        }
      }
      catch (e) {
        // Logger.debug(`Queue file does not exist. Queue is empty.`);
        resolve(true);
      }
    });
  },

  get: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        resolve(queue);
      }
      catch (queueFilePath) {
        Logger.debug(`Queue file does not exist. Queue is empty.`);
        resolve([]);
      }
    });
  },

  removeFile: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        Logger.debug(`Removing queue.json`);
        fs.unlinkSync(queueFilePath);
        resolve();
      }
      catch (e) {
        Logger.debug(`Queue file does not exist.`);
        resolve();
      }
    });
  },

};
