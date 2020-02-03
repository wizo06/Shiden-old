/**
 * @fileoverview Entry point of Shiden. It's a web server built with ExpressJS.
 */

// Import node modules
const express = require('express');
const path = require('path');
const util = require('util');
const fs = require('fs');
const Discord = require('discord.js');
const DISCORD_BOT = new Discord.Client();
require('toml-require').install({ toml: require('toml') });

// master will be set to TRUE if current git branch name is 'master'
const master = ('master' === fs.readFileSync(path.join(process.cwd(), '.git/HEAD'), { encoding: 'utf8' }).match(/ref: refs\/heads\/([^\n]+)/)[1]);

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/utils/auth.js'));
const Encoder = require(path.join(process.cwd(), 'src/automata/encoder.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Notification = require(path.join(process.cwd(), 'src/automata/notification.js'));
const Rclone = require(path.join(process.cwd(), 'src/automata/rclone.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));
const Temp = require(path.join(process.cwd(), 'src/utils/temp.js'));
const CONFIG = require(path.join(process.cwd(), 'src/utils/config.js'));

const processNextPayload = async () => {
  try {
    Logger.info(`[0/4] Processing next payload in queue`, Logger.Colors.Bright + Logger.Colors.FgCyan);
    console.log(util.inspect(await Queue.getFirst()));
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

const app = express();

app.use(express.json());

app.get('/', async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    res.send(await Queue.get());
  }
  catch (e) {
    Logger.error(e);
  }
});

app.post('/encode', async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    if (req.get('Content-Type') !== 'application/json') return res.status(415).send('Content-Type must be application/json');
    if (!(req.body.show && req.body.full_path)) return res.status(400).send('JSON body must have "show" and "full_path"');
    if (await Queue.includes(req.body)) return res.status(409).send('Payload is in queue already');

    res.status(209).send('Payload accepted');

    const payload = req.body;
    Logger.info(`Loaded show: ${payload.show}`, Logger.Colors.Bright + Logger.Colors.FgMagenta);
    Logger.info(`Loaded episode: ${path.basename(payload.full_path)}`, Logger.Colors.Bright + Logger.Colors.FgMagenta);

    if (await Queue.isEmpty()) {
      await Queue.push(payload);
      processNextPayload();
    }
    else {
      await Queue.push(payload);
    }
  }
  catch (e) {
    Logger.error(e);
  }
});

app.post('/batch', async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    if (req.get('Content-Type') !== 'application/json') return res.status(415).send('Content-Type must be application/json');
    if (!(req.body.show && req.body.full_path)) return res.status(400).send('JSON body must have "show" and "full_path"');

    res.status(209).send('Payload accepted');

    const payload = req.body;
    Logger.info(`Loaded show: ${payload.show}`, Logger.Colors.Bright + Logger.Colors.FgMagenta);
    Logger.info(`Loaded full_path: ${payload.full_path}`, Logger.Colors.Bright + Logger.Colors.FgMagenta);

    const arrOfEpisodes = await Rclone.getListOfEpisodes(payload);

    if (!arrOfEpisodes[0]) {
      Logger.debug('No episodes in folder');
      return;
    }

    if (await Queue.isEmpty()) {
      for (episode of arrOfEpisodes) {
        Logger.info(`Loaded episode: ${episode}`, Logger.Colors.Bright + Logger.Colors.FgMagenta);
        const episodePayload = {
          show: payload.show,
          full_path: path.join(payload.full_path, episode),
          video_index: payload.video_index,
          audio_index: payload.audio_index,
          sub_index: payload.sub_index,
        };
        await Queue.push(episodePayload);
      }
      processNextPayload();
    }
    else {
      for (episode of arrOfEpisodes) {
        Logger.info(`Loaded episode: ${episode}`, Logger.Colors.Bright + Logger.Colors.FgMagenta);
        const episodePayload = {
          show: payload.show,
          full_path: path.join(payload.full_path, episode),
          video_index: payload.video_index,
          audio_index: payload.audio_index,
          sub_index: payload.sub_index,
        };
        await Queue.push(episodePayload);
      }
    }
  }
  catch (e) {
    Logger.error(e);
  }
});

app.all('*', (req, res) => res.status(405).send('Invalid endpoint'));

app.listen(CONFIG.express.port, async () => {
  if (!master) Logger.warning(`Running on DEV mode`);
  Logger.info(`Running on http://localhost:${CONFIG.express.port}/`, Logger.Colors.FgGreen);
  try {
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
    if (process.argv.slice(2).includes('--clean')) await Queue.removeFile();
    if (!(await Queue.isEmpty())) processNextPayload();
  }
  catch (e) {
    Logger.error(e);
  }
});
