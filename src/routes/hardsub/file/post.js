// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
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
    if (!(payload.show && payload.full_path)) return res.status(400).send('JSON body must have "show" and "full_path"');
    if (await Queue.includes(payload)) return res.status(409).send('Payload is in queue already');

    res.status(209).send('Payload accepted');

    Logger.info(`Loaded show: ${payload.show}`);
    Logger.info(`Loaded episode: ${path.basename(payload.full_path)}`);

    if (await Queue.isEmpty()) {
      await Queue.push(payload);
      processNextPayload();
    }
    else {
      await Queue.push(payload);
    }
  }
  catch (e) {
    Logger.debug(e);

    if (e.includes('SyntaxError')) return res.status(400).send(e);
    else return res.status(500).send('Unknown error');
  }
});
