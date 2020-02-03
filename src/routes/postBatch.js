// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Rclone = require(path.join(process.cwd(), 'src/automata/rclone.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));

const { processNextPayload } = require(path.join(process.cwd(), 'src/pipeline.js'));

module.exports = router.post('/batch', async (req, res) => {
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
