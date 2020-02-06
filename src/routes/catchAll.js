// Import node modules
const express = require('express');
const router = new express.Router();

module.exports = router.all('*', (req, res) => res.status(405).send('Invalid endpoint'));
