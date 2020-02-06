// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));

// Import pipeline flow
const processNextPayload = require(path.join(process.cwd(), 'src/pipeline.js'));

module.exports = router.post('/encode', async (req, res) => {
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
