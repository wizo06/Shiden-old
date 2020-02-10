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
    const payload = await Promisefied.jsonParse(req.body);

    const requiredKeys = ['folder'];
    const payloadHasAllRequiredKeys = requiredKeys.every(element => typeof payload[element] !== 'undefined');
    if (!(payloadHasAllRequiredKeys)) return res.status(400).send('Missing required key');

    res.status(209).send('Payload accepted');

    for ([key, value] of Object.entries(payload)) {
      Logger.success(`Loaded ${key}: ${value}`);
    }

    const arrOfEpisodes = await Rclone.getListOfEpisodes(payload);

    if (!arrOfEpisodes[0]) {
      Logger.debug('No episodes in folder');
      return;
    }

    if (await Queue.isEmpty()) {
      for (episode of arrOfEpisodes) {
        Logger.info(`Loaded episode: ${episode}`);
        const episodePayload = {
          show: payload.show,
          file: path.join(payload.folder, episode),
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
        Logger.info(`Loaded episode: ${episode}`);
        const episodePayload = {
          show: payload.show,
          folder: path.join(payload.folder, episode),
          video_index: payload.video_index,
          audio_index: payload.audio_index,
          sub_index: payload.sub_index,
        };
        await Queue.push(episodePayload);
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
