// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Notification = require(path.join(process.cwd(), 'src/automata/notification.js'));
const Rclone = require(path.join(process.cwd(), 'src/automata/rclone.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));

// Import pipeline flow
const processNextPayload = require(path.join(process.cwd(), 'src/pipeline.js'));

module.exports = router.post('/hardsub/folder', async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    if (req.get('Content-Type') !== 'application/json') return res.status(415).send('Content-Type must be application/json');
    const folderPayload = await Promisefied.jsonParse(req.body);

    const requiredKeys = ['folder'];
    const payloadHasAllRequiredKeys = requiredKeys.every(element => typeof folderPayload[element] !== 'undefined');
    if (!(payloadHasAllRequiredKeys)) return res.status(400).send('Missing required key');

    res.status(209).send('Payload accepted');

    for ([key, value] of Object.entries(folderPayload)) {
      Logger.success(`Loaded ${key}: ${value}`);
    }

    // Remove trailing slash
    folderPayload.folder = folderPayload.folder.replace(/\/$/, '');
    const arrOfFiles = await Rclone.getListOfEpisodes(folderPayload);

    if (!arrOfFiles[0]) {
      Logger.debug('No episodes in folder');
      return;
    }

    if (await Queue.isEmpty()) {
      // If queue is empty, load all episodes then start processing
      for (episode of arrOfFiles) {
        Logger.info(`Loaded episode: ${episode}`);

        const filePayload = Object.assign({}, folderPayload);
        filePayload.file = path.join(folderPayload.folder, episode);
        await Queue.push(filePayload);
      }
      processNextPayload();
    }
    else {
      // Otherwise, simply load all episodes
      for (episode of arrOfFiles) {
        Logger.info(`Loaded episode: ${episode}`);

        const filePayload = Object.assign({}, folderPayload);
        filePayload.file = path.join(folderPayload.folder, episode);
        await Queue.push(filePayload);
      }
    }
  }
  catch (status) {
    Logger.error(status);
    if (status === 6) {
      Logger.error(`Exit code: ${status}`);
      Logger.info('[4/4] Sending notifications...');
      Notification.send(status);
      return;
    }
    if (e === 'SyntaxError') return res.status(400).send(status);
    else return res.status(500).send('Unknown error');
  }
});
