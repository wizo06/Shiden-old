// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/shared/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/shared/utils/logger.js'));
const Queue = require(path.join(process.cwd(), 'src/shared/utils/queue.js'));

module.exports = router.get('/queue', async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    return res.send(await Queue.get());
  }
  catch (e) {
    Logger.error(e);
  }
});
