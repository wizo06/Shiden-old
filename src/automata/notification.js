/**
 * @module notification
 * This module handles getting metadata of the show from Anilist
 * and then sending notification to discord webhooks
 */

// Import node modules
const path = require('path');
const util = require('util');
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));
const Anilist = require(path.join(process.cwd(), 'src/automata/anilist.js'));
const Kitsu = require(path.join(process.cwd(), 'src/automata/kitsu.js'));
const { webhook } = require(path.join(process.cwd(), 'src/utils/config.js'));

const sendToWebhook = (anilistResponse, kitsuResponse, status, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (typeof anilistResponse === 'undefined') {
        Logger.error(`Anilist response is undefined. Not sending notification.`);
        return;
      }

      let typeOfFailure = '';
      if (status === 3) typeOfFailure = 'Download failed';
      else if (status === 4) typeOfFailure = 'Hardsub failed';
      else if (status === 5) typeOfFailure = 'Upload failed';
      else if (status === 6) typeOfFailure = 'Folder not found';
      else if (status === 7) typeOfFailure = 'Could not list files in folder';

      // Description
      const fileName = path.basename(payload.full_path);

      // Color
      const purple = 8978687;
      const red = 16711680;

      // Links
      const malUrl = 'https://myanimelist.net/anime/' + anilistResponse.idMal;
      const kitsuUrl = 'https://kitsu.io/anime/' + kitsuResponse;

      let links = [];
      if (anilistResponse.idMal) links.push(`[MAL](${malUrl})`);
      if (anilistResponse.siteUrl) links.push(`[Anilist](${anilistResponse.siteUrl})`);
      if (kitsuResponse) links.push(`[Kitsu](${kitsuUrl})`);
      links = links.join(' | ');

      const jsonSuccessSimple = {
        embeds: [
          {
            title: fileName,
            timestamp: (new Date()).toISOString(),
            color: purple,
            footer: {
              text: anilistResponse.title.romaji,
            },
            image: {
              url: 'https://firebasestorage.googleapis.com/v0/b/shiden-e263a.appspot.com/o/Untitled-1-01.png?alt=media&token=ca800898-a8a4-4544-b5c2-52158026753f',
            },
            thumbnail: {
              url: anilistResponse.coverImage.extraLarge,
            },
            author: {
              name: `Available now`,
            },
            fields: [
              {
                name: 'Links',
                value: `[MAL](${malUrl}) | [Anilist](${anilistResponse.siteUrl}) | [Kitsu](${kitsuUrl})`,
                inline: true,
              },
            ],
          },
        ],
      };

      const jsonFailed = {
        embeds: [
          {
            title: payload.show,
            description: payload.full_path,
            timestamp: (new Date()).toISOString(),
            color: red,
            image: {
              url: 'https://firebasestorage.googleapis.com/v0/b/shiden-e263a.appspot.com/o/Untitled-1-01.png?alt=media&token=ca800898-a8a4-4544-b5c2-52158026753f',
            },
            fields: [
              {
                name: 'Type of failure',
                value: typeOfFailure,
              },
            ],
          },
        ],
      };

      for (url of webhook.discordWebhooks) {
        const options = {
          url: url,
          method: 'POST',
          json: (typeof status === 'undefined') ? jsonSuccessSimple : jsonFailed,
        };

        Logger.info(`Sending request to ${url}`);
        const response = await Promisefied.request(options);
        if (response.res.statusCode === 204) Logger.success(`Successful sent with return of ${response.res.statusCode}`);
        else {
          Logger.debug(response.res.statusCode);
          Logger.debug(util.inspect(response.body));
          console.log(util.inspect(anilistResponse, { depth: null, colors: true }));
        }
      }
      resolve();
    }
    catch (e) {
      Logger.error(e);
    }
  });
};

const notification = status => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = await Queue.getFirst();

      if (payload.show) {
        const kitsuResponse = await Kitsu.query(payload.show);
        const anilistResponse = await Anilist.query(payload.show);
        await sendToWebhook(anilistResponse, kitsuResponse, status, payload);
      }
      else {
        await sendToWebhook(undefined, undefined, status, paylaod);
      }
      resolve();
    }
    catch (e) {
      Logger.error(e);
    }
  });
};

module.exports = {
  notification,
};
