/**
 * @module kitsu
 * This module handles requests to Kitsu
 */

// Import node modules
const path = require('path');

// Import custom modules
const Promisefied = require(path.join(process.cwd(), 'src/shared/utils/promisefied.js'));

module.exports = Kitsu = {
  query: showName => {
    return new Promise(async (resolve, reject) => {
      try {
        const options = {
          url: encodeURI(`https://kitsu.io/api/edge/anime?filter[text]=${showName}`),
          method: 'GET',
        };
        const response = await Promisefied.request(options);

        if (response.res.statusCode === 200) {
          const parsedBody = JSON.parse(response.body);
          if (parsedBody.data[0]) {
            if (parsedBody.data[0].attributes) {
              resolve(parsedBody.data[0].attributes.slug);
            }
            else {
              resolve(undefined);
            }
          }
          else {
            console.log(parsedBody.data);
            resolve(undefined);
          }
        }
        else {
          console.log(response.body);
          resolve(undefined);
        }
      }
      catch (e) {
        Logger.error(e);
        resolve(undefined);
      }
    });
  },
};
