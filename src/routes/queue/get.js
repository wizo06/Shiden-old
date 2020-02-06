// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));

const endpoint = __dirname.replace(path.join(process.cwd(), 'src/routes'), '');

module.exports = router.get(endpoint, async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    res.send(await Queue.get());
  }
  catch (e) {
    Logger.error(e);
  }
});
