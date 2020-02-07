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

const endpoint = __dirname.replace(path.join(process.cwd(), 'src/routes'), '');

module.exports = router.post(endpoint, async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    if (req.get('Content-Type') !== 'application/json') return res.status(415).send('Content-Type must be application/json');
    const payload = await Promisefied.jsonParse(req.body);
    if (!(payload.full_path)) return res.status(400).send('JSON body must have "full_path"');

    res.status(209).send('Payload accepted');

    Logger.info(`Loaded full_path: ${payload.full_path}`);

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
        Logger.info(`Loaded episode: ${episode}`);
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
  catch (status) {
    Logger.error(status);
    if (status === 6) {
      Logger.error(`Exit code: ${status}`);
      Logger.info('[4/4] Sending notifications...');
      Notification.notification(status);
      return;
    }
    if (status.includes('SyntaxError')) return res.status(400).send(status);
    else return res.status(500).send('Unknown error');
  }
});
