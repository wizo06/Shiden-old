// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));

module.exports = router.delete('/queue', async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    if (req.get('Content-Type') !== 'application/json') return res.status(415).send('Content-Type must be application/json');
    const payload = await Promisefied.jsonParse(req.body);

    const requiredKeys = ['stringMatch'];
    const payloadHasAllRequiredKeys = requiredKeys.every(element => typeof payload[element] !== 'undefined');
    if (!(payloadHasAllRequiredKeys)) return res.status(400).send('Missing required key');

    for ([key, value] of Object.entries(payload)) {
      Logger.success(`Loaded ${key}: ${value}`);
    }

    await Queue.removePayload(payload);
    return res.status(209).send('Payload deleted');
  }
  catch (e) {
    Logger.debug(e);

    if (e === 'SyntaxError') return res.status(400).send(e);
    if (e.includes('Payload not found')) return res.status(404).send(e);
    if (e.includes('Queue file does not exist')) return res.status(404).send('Queue is empty');
    else return res.status(500).send('Unknown error');
  }
});
