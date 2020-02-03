// Import node modules
const path = require('path');
const moment = require('moment');
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

      // Description
      const fileName = path.basename(payload.full_path);
      // let regex = /\d+\s\[(\d|\w)+\]\.(\d|\w)+$/;
      // let episodeNumber = fileName.match(regex)[0].split(' ')[0];

      // Source or Sequel
      const prequelRelation = anilistResponse.relations.edges.filter(relation => relation.relationType === 'PREQUEL')[0];
      const sourceOrSequelName = (prequelRelation) ? 'Sequel to' : 'Source';
      const sourceOrSequelValue = (prequelRelation) ? `[${prequelRelation.node.title.romaji}](${prequelRelation.node.siteUrl})` : anilistResponse.source;

      // Color
      const purple = 8978687;
      const red = 16711680;

      // Next episode or Season Year
      let nextEpisodeName = '';
      let nextEpisodeValue = '';
      if (anilistResponse.nextAiringEpisode) {
        nextEpisodeName = `Ep ${anilistResponse.nextAiringEpisode.episode} of ${anilistResponse.episodes} airing on`;

        const nextEpDate = moment(anilistResponse.nextAiringEpisode.airingAt).format('ddd, MMM DD');
        const nextEpDays = moment.duration(anilistResponse.nextAiringEpisode.timeUntilAiring, 'seconds').days();
        const nextEpHours = moment.duration(anilistResponse.nextAiringEpisode.timeUntilAiring, 'seconds').hours();
        const nextEpMinutes = moment.duration(anilistResponse.nextAiringEpisode.timeUntilAiring, 'seconds').minutes();
        const airingLink = 'https://anichart.net/airing';
        nextEpisodeValue = (nextEpHours == '0') ? `[${nextEpDate} (${nextEpDays}d, ${nextEpMinutes}m)](${airingLink})` : `[${nextEpDate} (${nextEpDays}d, ${nextEpHours}h)](${airingLink})`;
      }
      else {
        nextEpisodeName = `${anilistResponse.episodes} episodes aired on`;
        nextEpisodeValue = `[${anilistResponse.season} ${anilistResponse.seasonYear}](https://anichart.net/${anilistResponse.season}-${anilistResponse.seasonYear})`;
      }

      // Genres
      const genres = anilistResponse.genres.map(genre => `[${genre}](${encodeURI('https://anilist.co/search/anime?includedGenres=').href})`);

      // Links
      const malUrl = 'https://myanimelist.net/anime/'+anilistResponse.idMal;
      const kitsuUrl = 'https://kitsu.io/anime/'+kitsuResponse;

      let links = [];
      if (anilistResponse.idMal) links.push(`[MAL](${malUrl})`);
      if (anilistResponse.siteUrl) links.push(`[Anilist](${anilistResponse.siteUrl})`);
      if (kitsuResponse) links.push(`[Kitsu](${kitsuUrl})`);
      links = links.join(' | ');

      const jsonSuccess = {
        embeds: [
          {
            title: anilistResponse.title.romaji,
            description: fileName,
            url: anilistResponse.siteUrl,
            timestamp: (new Date()).toISOString(),
            color: purple,
            footer: {
              text: path.basename(payload.full_path),
            },
            image: {
              url: 'https://firebasestorage.googleapis.com/v0/b/shiden-e263a.appspot.com/o/Untitled-1-01.png?alt=media&token=ca800898-a8a4-4544-b5c2-52158026753f',
            },
            thumbnail: {
              url: anilistResponse.coverImage.extraLarge,
            },
            author: {
              name: `Studio: ${anilistResponse.studios.nodes[0].name}`,
              url: anilistResponse.studios.nodes[0].siteUrl,
            },
            fields: [
              {
                name: nextEpisodeName,
                value: nextEpisodeValue,
              },
              {
                name: sourceOrSequelName,
                value: sourceOrSequelValue,
                inline: true,
              },
              {
                name: 'Format',
                value: anilistResponse.format,
                inline: true,
              },
              {
                name: 'Average Score',
                value: anilistResponse.averageScore + '%',
                inline: true,
              },
              {
                name: 'Genres',
                value: genres.join(', '),
                inline: true,
              },
              {
                name: 'Links',
                value: links,
                inline: true,
              },
            ],
          },
        ],
      };

      const jsonSuccessSimple = {
        embeds: [
          {
            title: fileName,
            // description: fileName,
            // url: anilistResponse.siteUrl,
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
        if (response.res.statusCode === 204) Logger.info(`Successful sent with return of ${response.res.statusCode}`);
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

      const kitsuResponse = await Kitsu.query(payload.show);
      const anilistResponse = await Anilist.query(payload.show);
      await sendToWebhook(anilistResponse, kitsuResponse, status, payload);
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
