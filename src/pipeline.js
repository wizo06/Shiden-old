/**
 * @fileoverview The flow in which Shiden will process each payload.
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
    Logger.info(`[0/4] Processing next payload in queue`, Logger.Colors.Bright + Logger.Colors.FgCyan);
    console.log(util.inspect(await Queue.getFirst(), { colors: true }));
    Logger.info('[1/4] Downloading episode file...', Logger.Colors.FgCyan);
    if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('download', { type: 'PLAYING' });
    await Rclone.download();
    Logger.info('[2/4] Hardsubbing episode file...', Logger.Colors.FgCyan);
    if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('hardsub', { type: 'PLAYING' });
    await Encoder.encode();
    Logger.info('[3/4] Uploading episode file...', Logger.Colors.FgCyan);
    if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('upload', { type: 'PLAYING' });
    await Rclone.upload();
    Logger.info('[4/4] Sending notifications...', Logger.Colors.FgCyan);
    Notification.notification();
    await Temp.destroy();
    await Queue.shift();
    Logger.info(`Job completed`, Logger.Colors.FgGreen);
    if (!(await Queue.isEmpty())) processNextPayload();
    if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('idle', { type: 'PLAYING' });
  }
  catch (status) {
    Logger.error(`Exit code: ${status}`);
    Logger.info('[4/4] Sending notifications...', Logger.Colors.FgCyan);
    try {
      Notification.notification(status);
      await Temp.destroy();
      await Queue.shift();
      if (!(await Queue.isEmpty())) processNextPayload();
      if (CONFIG.discord_bot.token) await DISCORD_BOT.user.setActivity('idle', { type: 'PLAYING' });
    }
    catch (e) {
      Logger.error(e);
    }
  }
};
