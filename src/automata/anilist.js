/**
 * @module anilist
 * This module handles requests to Anilist GraphQL API
 */

// Import node modules
const path = require('path');

// Import custom modules
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));

module.exports = Anilist = {
  query: showName => {
    return new Promise(async (resolve, reject) => {
      try {
        const variables = {
          name: showName,
        };

        const options = {
          url: 'https://graphql.anilist.co',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            query: `
            query ($name: String){
              Media(search: $name, type: ANIME) {
                id
                idMal
                title {
                  romaji
                  native
                }
                format
                status
                season
                seasonYear
                siteUrl
                episodes
                duration
                source (version: 2)
                coverImage {
                  large
                  extraLarge
                }
                bannerImage
                genres
                averageScore
                relations {
                  edges {
                    relationType (version: 2)
                    node {
                      title {
                        romaji
                      }
                      siteUrl
                      format
                    }
                  }
                }
                studios {
                  nodes {
                    name
                    siteUrl
                  }
                }
                nextAiringEpisode {
                  airingAt
                  timeUntilAiring
                  episode
                }
              }
            }

            `,
            variables: variables,
          }),
        };

        const response = await Promisefied.request(options);

        if (response.res.statusCode === 200) {
          const parsedBody = JSON.parse(response.body);
          if (parsedBody.data) {
            resolve(parsedBody.data.Media);
          }
          else {
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
