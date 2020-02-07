/**
 * @module pipeline
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
const CONFIG = require(path.join(process.cwd(), 'src/utils/config.js'));

// Import discord bot instance
const DISCORD_BOT = require(path.join(process.cwd(), 'src/server.js'));

module.exports = processNextPayload = async () => {
  try {
    // Step 0: Print out the payload to be processed
    Logger.info(`[0/4] Processing next payload in queue`);
    console.log(util.inspect(await Queue.getFirst(), { colors: true }));

    // Step 1: Download the file
    Logger.info('[1/4] Downloading episode file...');
    if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('download', { type: 'PLAYING' });
    await Rclone.download();

    // Step 2: Hardsub the file
    Logger.info('[2/4] Hardsubbing episode file...');
    if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('hardsub', { type: 'PLAYING' });
    await Encoder.encode();

    // Step 3: Upload the file
    Logger.info('[3/4] Uploading episode file...');
    if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('upload', { type: 'PLAYING' });
    await Rclone.upload();

    // Step 4: Send notifications
    Logger.info('[4/4] Sending notifications...');
    Notification.notification();

    // Clean up
    await Temp.destroy();
    await Queue.shift();
    Logger.info(`Job completed`);
    if (!(await Queue.isEmpty())) processNextPayload();
    if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('idle', { type: 'PLAYING' });
  }
  catch (status) {
    try {
      // Skip to Step 4 if step 1, 2 or 3 failed
      Logger.error(`Exit code: ${status}`);
      Logger.info('[4/4] Sending notifications...');
      Notification.notification(status);

      // Clean up
      await Temp.destroy();
      await Queue.shift();
      Logger.error(`Job failed`);
      if (!(await Queue.isEmpty())) processNextPayload();
      if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('idle', { type: 'PLAYING' });
    }
    catch (e) {
      Logger.error(e);
    }
  }
};
