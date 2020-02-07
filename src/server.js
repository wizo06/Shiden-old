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
const hardsubFilePost = require(path.join(process.cwd(), 'src/routes/hardsub/file/post.js'));
const hardsubFolderPost = require(path.join(process.cwd(), 'src/routes/hardsub/folder/post.js'));
const queueDelete = require(path.join(process.cwd(), 'src/routes/queue/delete.js'));
const queueGet = require(path.join(process.cwd(), 'src/routes/queue/get.js'));
const catchAll = require(path.join(process.cwd(), 'src/routes/catchAll.js'));

// Import pipeline flow
const processNextPayload = require(path.join(process.cwd(), 'src/pipeline.js'));

// Create ExpressJS app
const app = express();

// Use "express.text()" to parse incoming requests payload as a plain string
// This allows us to handle the "JSON.parse()" on our own and wrap it around a "try..catch" block
// And supress the ugly error message if the payload has incorrect JSON syntax
app.use(express.text({ type: 'application/json' }));

// Define routes
app.use(hardsubFilePost);
app.use(hardsubFolderPost);
app.use(queueDelete);
app.use(queueGet);
app.use(catchAll);

app.listen(CONFIG.express.port, async () => {
  if (!master) Logger.warning(`Running on DEV mode`);
  Logger.info(`Running on http://localhost:${CONFIG.express.port}/`);

  try {
    // If statement block for Discord bot
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

    // Start processing payloads in queue if there are leftovers
    if (!(await Queue.isEmpty())) processNextPayload();
  }
  catch (e) {
    Logger.error(e);
  }
});
