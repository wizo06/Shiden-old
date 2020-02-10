/**
 * @module queue
 * This module handles the queue
 */

// Import node modules
const fs = require('fs');
const path = require('path');
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Paths = require(path.join(process.cwd(), 'src/utils/paths.js'));

module.exports = Queue = {
  /**
   * Gets the absolute path of the queue file and returns it in a resolve() or reject()
   * @return {{string}} - Returns a string with the absolute path of the queue file
   */
  getFilePath: () => {
    return new Promise(async (resolve, reject) => {
      if (fs.existsSync(Paths.queueFile)) resolve(Paths.queueFile);
      else reject(Paths.queueFile);
    });
  },

  /**
   * Read the content of the queue file and returns it in JSON format
   * @param {{string}} queueFilePath - The absolute path to the queue file
   * @return {{Object}} - Returns the current queue in JSON format
   */
  readFile: queueFilePath => {
    const data = fs.readFileSync(queueFilePath, { encoding: 'utf8' });
    return JSON.parse(data);
  },

  /**
   * Write to queue file
   * @param {{string}} queueFilePath
   * @param {{Object}} data
   */
  writeFile: (queueFilePath, data) => {
    fs.writeFileSync(queueFilePath, JSON.stringify(data), { encoding: 'utf8' });
  },

  /**
   * Append incoming payload to the queue
   * @param {{Object}} payload - Incoming payload in JSON format
   * @return {{void}}
   */
  push: payload => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        queue.push(payload);
        Logger.debug(`Queueing payload`);
        Queue.writeFile(queueFilePath, queue);
        resolve();
      }
      catch (queueFilePath) {
        Logger.debug('Queue file does not exist. Write to file without reading first.');
        const queue = [payload];
        Logger.debug(`Queueing payload`);
        Queue.writeFile(queueFilePath, queue);
        resolve();
      }
    });
  },

  /**
   * Get the first element in the queue and returns it
   * @return {{Object}} - Returns the first element in the queue in JSON format
   */
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

  /**
   * Remove the first element in the queue
   * @return {{void}}
   */
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

  /**
   * Check if queue is empty or not and returns a boolean
   * @return {{boolean}}
   */
  isEmpty: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        if (queue.length) {
          Logger.debug(`Queue still has payloads`);
          resolve(false);
        }
        else {
          Logger.debug(`Queue is empty`);
          resolve(true);
        }
      }
      catch (e) {
        Logger.debug(`Queue file does not exist. Queue is empty.`);
        resolve(true);
      }
    });
  },

  /**
   * Get the entire queue and returns it in an array
   * @return {{Array}}
   */
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

  /**
   * Remove the queue file itself
   * @return {{void}}
   */
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

  /**
   * Remove all payloads that matches a substring
   * @param {{Object}} payload - Incoming payload with the substring used to match elements in the queue
   * @return {{void}}
   */
  removePayload: payload => {
    return new Promise(async (resolve, reject) => {
      try {
        const queueFilePath = await Queue.getFilePath();
        const queue = Queue.readFile(queueFilePath);
        const filtered = queue.filter((queueItem, index) => {
          const queueItemIsFirstElement = index === 0;
          const queueItemDoesNotContainSubstring = !queueItem.sourceFile.includes(payload.sourceFile);
          if (queueItemIsFirstElement || queueItemDoesNotContainSubstring) {
            return true; // Return true if item is first element OR does not match substring
          }
          else return false;
        });

        // If the filtered array has the same length as the original queue array
        // then it means no payload was removed.
        if (filtered.length === queue.length) return reject('Payload not found');
        Queue.writeFile(queueFilePath, filtered);
        resolve();
      }
      catch (e) {
        Logger.debug(`Queue file does not exist.`);
        reject(`Queue file does not exist.`);
      }
    });
  },

};
