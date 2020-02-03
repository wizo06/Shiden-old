/**
 * https://github.com/BeeeQueue/arm-server
 * https://github.com/manami-project/anime-offline-database/
 */
// Import node modules
const path = require('path');

// Import custom modules
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));

module.exports = AnimeOfflineDatabase = {
  query: id => {
    return new Promise(async (resolve, reject) => {
      const options = {
        url: `https://relations.yuna.moe/api/ids?source=anilist&id=${id}`,
        method: 'GET',
      };

      const response = await Promisefied.request(options);
      if (response.res.statusCode === 200) {
        const parsedBody = JSON.parse(response.body);

        if (parsedBody.anidb) {
          resolve(parsedBody.anidb);
        }
        else {
          resolve('');
        }
      }
    });
  },
};
