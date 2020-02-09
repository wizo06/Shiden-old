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
const AnimeOfflineDatabase = require(path.join(process.cwd(), 'src/automata/animeOfflineDatabase.js'));
const { webhook } = require(path.join(process.cwd(), 'src/utils/config.js'));

const send = statusCode => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = await Queue.getFirst();

      if (payload.show) {
        const anilistResponse = await Anilist.query(payload.show);
        const kitsuResponse = await Kitsu.query(payload.show);
        const aniDBID = await AnimeOfflineDatabase.query(anilistResponse.id);
        const embed = buildEmbeds(anilistResponse, kitsuResponse, aniDBID, statusCode, payload);
        await postToWebhook(statusCode, embed);
      }
      else {
        const embed = buildEmbeds(undefined, undefined, undefined, statusCode, payload);
        await postToWebhook(statusCode, embed);
      }
      resolve();
    }
    catch (e) {
      Logger.error(e);
      resolve();
    }
  });
};

const buildEmbeds = (anilistResponse, kitsuResponse, aniDBID, statusCode, payload) => {
  // Color
  const purple = 8978687;
  const red = 16711680;

  const typeOfFailure = getTypeOfFailure(statusCode);

  // Failed embed
  const arrOfFields = [];
  for (const [key, value] of Object.entries(payload)) {
    arrOfFields.push({ name: key, value: value });
  }

  const failedEmbed = {
    embeds: [
      {
        title: typeOfFailure,
        timestamp: (new Date()).toISOString(),
        color: red,
        image: {
          url: 'https://firebasestorage.googleapis.com/v0/b/shiden-e263a.appspot.com/o/Untitled-1-01.png?alt=media&token=ca800898-a8a4-4544-b5c2-52158026753f',
        },
        fields: arrOfFields,
      },
    ],
  };

  if (typeof anilistResponse !== 'undefined') {
    // Success embed with metadata
    const successEmbed = {
      embeds: [
        {
          title: path.basename(payload.file).replace(path.extname(payload.file), '.mp4'),
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
              value: `[MAL](https://myanimelist.net/anime/${anilistResponse.idMal}) | [Anilist](${anilistResponse.siteUrl}) | [Kitsu](https://kitsu.io/anime/${kitsuResponse}) | [AniDB](https://anidb.net/anime/${aniDBID})`,
              inline: true,
            },
          ],
        },
      ],
    };

    return { success: successEmbed, failed: failedEmbed };
  }

  // Success embed without metadata
  const successEmbedNoMetadata = {
    embeds: [
      {
        title: path.basename(payload.file).replace(path.extname(payload.file), '.mp4'),
        timestamp: (new Date()).toISOString(),
        color: purple,
        image: {
          url: 'https://firebasestorage.googleapis.com/v0/b/shiden-e263a.appspot.com/o/Untitled-1-01.png?alt=media&token=ca800898-a8a4-4544-b5c2-52158026753f',
        },
        thumbnail: {
          url: 'https://discordapp.com/assets/f8389ca1a741a115313bede9ac02e2c0.svg',
        },
        author: {
          name: `Available now`,
        },
      },
    ],
  };


  return { success: successEmbedNoMetadata, failed: failedEmbed };
};

const getTypeOfFailure = statusCode => {
  if (statusCode === 3) return 'Download failed';
  if (statusCode === 4) return 'Hardsub failed';
  if (statusCode === 5) return 'Upload failed';
  if (statusCode === 6) return 'Folder not found';
  if (statusCode === 7) return 'Listing files in folder failed';
  return 'Unknown';
};

const postToWebhook = (statusCode, embed) => {
  return new Promise(async (resolve, reject) => {
    try {
      for (url of webhook.discordWebhooks) {
        const options = {
          url: url,
          method: 'POST',
          json: (typeof statusCode === 'undefined') ? embed.success : embed.failed,
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
      resolve();
    }
  });
};

module.exports = {
  send,
};
