/**
 * @fileoverview Entry point of Shiden. It's an ExpressJS app.
 */

// Import node modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const Discord = require('discord.js');
const DISCORD_BOT = new Discord.Client();
module.exports = DISCORD_BOT;
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));
const Temp = require(path.join(process.cwd(), 'src/utils/temp.js'));
const CONFIG = require(path.join(process.cwd(), 'src/utils/config.js'));

// master will be set to TRUE if current git branch name is 'master'
const master = ('master' === fs.readFileSync(path.join(process.cwd(), '.git/HEAD'), { encoding: 'utf8' }).match(/ref: refs\/heads\/([^\n]+)/)[1]);

// Import routes
const getQueue = require(path.join(process.cwd(), 'src/routes/getQueue.js'));
const postEncode = require(path.join(process.cwd(), 'src/routes/postEncode.js'));
const postBatch = require(path.join(process.cwd(), 'src/routes/postBatch.js'));
const catchAll = require(path.join(process.cwd(), 'src/routes/catchAll.js'));

// Import pipeline flow
const processNextPayload = require(path.join(process.cwd(), 'src/pipeline.js'));

// Create ExpressJS app
const app = express();

app.use(express.json());

// Define routes
app.use(getQueue);

app.use(postEncode);

app.use(postBatch);

app.use(catchAll);

app.listen(CONFIG.express.port, async () => {
  if (!master) Logger.warning(`Running on DEV mode`);
  Logger.info(`Running on http://localhost:${CONFIG.express.port}/`, Logger.Colors.FgGreen);

  try {
    // If block for Discord bot
    if (CONFIG.discord_bot.token) {
      try {
        await DISCORD_BOT.login(CONFIG.discord_bot.token);
        await DISCORD_BOT.user.setActivity('idle', { type: 'PLAYING' });
      }
      catch (e) {
        Logger.error(e);
      }
    }

    await Temp.destroy();

    // If "--clean" flag is passed, remove queue file
    if (process.argv.slice(2).includes('--clean')) await Queue.removeFile();

    // Start processing payloads in queue if there are any leftovers
    if (!(await Queue.isEmpty())) processNextPayload();
  }
  catch (e) {
    Logger.error(e);
  }
});
