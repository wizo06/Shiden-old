// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/shared/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/shared/utils/logger.js'));
const Queue = require(path.join(process.cwd(), 'src/shared/utils/queue.js'));
const Promisefied = require(path.join(process.cwd(), 'src/shared/utils/promisefied.js'));

module.exports = router.post('/hardsub/file', async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    if (req.get('Content-Type') !== 'application/json') return res.status(415).send('Content-Type must be application/json');
    const payload = await Promisefied.jsonParse(req.body);

    const requiredKeys = ['sourceFile', 'destFolder'];
    const payloadHasAllRequiredKeys = requiredKeys.every(element => typeof payload[element] !== 'undefined');
    if (!(payloadHasAllRequiredKeys)) return res.status(400).send('Missing required key');

    res.status(209).send('Payload accepted');

    for ([key, value] of Object.entries(payload)) {
      Logger.success(`Loaded ${key}: ${value}`);
    }

    await Queue.push(payload);
  }
  catch (e) {
    Logger.debug(e);

    if (e === 'SyntaxError') return res.status(400).send(e);
    else return res.status(500).send('Unknown error');
  }
});
