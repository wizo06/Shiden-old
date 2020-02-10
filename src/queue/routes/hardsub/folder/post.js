// Import node modules
const path = require('path');
const express = require('express');
const router = new express.Router();

// Import custom modules
const Auth = require(path.join(process.cwd(), 'src/shared/utils/auth.js'));
const Logger = require(path.join(process.cwd(), 'src/shared/utils/logger.js'));
const Rclone = require(path.join(process.cwd(), 'src/shared/automata/rclone.js'));
const Queue = require(path.join(process.cwd(), 'src/shared/utils/queue.js'));
const Promisefied = require(path.join(process.cwd(), 'src/shared/utils/promisefied.js'));

module.exports = router.post('/hardsub/folder', async (req, res) => {
  try {
    if (!Auth.authorize(req.get('Authorization'))) return res.status(401).send('Not authorized');
    if (req.get('Content-Type') !== 'application/json') return res.status(415).send('Content-Type must be application/json');
    const folderPayload = await Promisefied.jsonParse(req.body);

    const requiredKeys = ['sourceFolder', 'destFolder'];
    const payloadHasAllRequiredKeys = requiredKeys.every(element => typeof folderPayload[element] !== 'undefined');
    if (!(payloadHasAllRequiredKeys)) return res.status(400).send('Missing required key');

    for ([key, value] of Object.entries(folderPayload)) {
      Logger.success(`Loaded ${key}: ${value}`);
    }

    // Remove trailing slash
    folderPayload.sourceFolder = folderPayload.sourceFolder.replace(/\/$/, '');
    const arrOfFiles = await Rclone.getListOfFiles(folderPayload);

    if (!arrOfFiles[0]) {
      Logger.error('Folder is empty');
      return res.status(406).send(`Folder is empty`);
    }

    res.status(209).send('Payload accepted');

    for (file of arrOfFiles) {
      Logger.success(`Loaded file: ${file}`);

      const filePayload = Object.assign({}, folderPayload);
      filePayload.sourceFile = path.join(folderPayload.sourceFolder, file);
      await Queue.push(filePayload);
    }
  }
  catch (status) {
    Logger.error(status);
    if (status === 6) {
      return res.status(406).send(`Folder not found`);
    }
    if (e === 'SyntaxError') return res.status(400).send(status);
    else return res.status(500).send('Unknown error');
  }
});
