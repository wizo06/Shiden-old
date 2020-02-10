/**
 * @fileoverview Checks for queue constantly and processes payloads once available.
 * This module defines the flow in which Shiden will process each payload.
 * 1. Download
 * 2. Hardsub
 * 3. Uplaod
 * 4. Notify
 */

// Import node modules
const path = require('path');
const util = require('util');

// Import custom modules
const Encoder = require(path.join(process.cwd(), 'src/automata/encoder.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Notification = require(path.join(process.cwd(), 'src/automata/notification.js'));
const Rclone = require(path.join(process.cwd(), 'src/automata/rclone.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));
const Temp = require(path.join(process.cwd(), 'src/utils/temp.js'));

const processNextPayload = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Step 0: Print out the payload to be processed
      Logger.info(`[0/4] Processing next payload in queue`);
      console.log(util.inspect(await Queue.getFirst(), { colors: true }));

      // Step 1: Download the file
      Logger.info('[1/4] Downloading file...');
      await Rclone.download();

      // Step 2: Hardsub the file
      Logger.info('[2/4] Hardsubbing file...');
      await Encoder.encode();

      // Step 3: Upload the file
      Logger.info('[3/4] Uploading file...');
      await Rclone.upload();

      // Step 4: Send notifications
      Logger.info('[4/4] Sending notifications...');
      Notification.send();

      // Clean up
      await Temp.destroy();
      await Queue.shift();
      Logger.info(`Job completed`);
      resolve();
    }
    catch (statusCode) {
      try {
        // Skip to Step 4 if step 1, 2 or 3 failed
        Logger.error(`Exit code: ${statusCode}`);
        Logger.info('[4/4] Sending notifications...');
        Notification.send(statusCode);

        // Clean up
        await Temp.destroy();
        await Queue.shift();
        Logger.error(`Job failed`);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject();
      }
    }
  });
};

(async () => {
  await Temp.destroy();
  while (true) {
    // Logger.debug('Checking if queue has payload');
    if (!(await Queue.isEmpty())) await processNextPayload();
  }
})();
