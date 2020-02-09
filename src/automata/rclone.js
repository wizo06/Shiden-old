/**
 * @module rclone
 * This module handles the execution of Rclone commands
 */

// Import node modules
const path = require('path');
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));
const Paths = require(path.join(process.cwd(), 'src/utils/paths.js'));
const Temp = require(path.join(process.cwd(), 'src/utils/temp.js'));
const { remote } = require(path.join(process.cwd(), 'src/utils/config.js'));
const { flags } = require(path.join(process.cwd(), 'src/utils/config.js'));

module.exports = Rclone = {
  /**
   * Check if a file exist in a remote storage
   * @param {{string}} source - remote storage name from rclone config
   * @param {{Object}} payload - Incoming payload in JSON format
   * @return {{boolean}}
   */
  checkEpisodeExists: (source, payload) => {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`Checking for episode in ${source}`);

        source = Paths.parseRclonePaths(source, payload.file);

        const command = `${Paths.rclonePath} lsf "${source}" --files-only ${flags.rclone.match(/--config \w+\/\w+\.conf/)}`;
        await Promisefied.exec(command);
        resolve(true);
      }
      catch (e) {
        Logger.error(e);
        resolve(false);
      }
    });
  },

  /**
   * Downloads the file from remote to temp folder
   * @return {{void}}
   */
  download: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = await Queue.getFirst();
        let validSource = false;
        for (src of remote.downloadSource) {
          if (await Rclone.checkEpisodeExists(src, payload)) {
            Logger.success(`Found file in ${src}`);
            validSource = src;
            break;
          }
        }

        // If episode not found in any source, reject
        if (!validSource) {
          Logger.error(`No sources contained the file, cancelling operation`);
          reject(3);
          return;
        }

        const source = Paths.parseRclonePaths(validSource, payload.file);
        const destination = await Temp.getTempFolderPath();

        Logger.info(`Downloading ${source}`);
        const command = `${Paths.rclonePath} copy "${source}" "${destination}" ${flags.rclone}`;
        await Promisefied.exec(command);
        Logger.success(`Download completed`);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject(3);
      }
    });
  },

  /**
   * Uploads the file from temp folder to remote
   * @return {{void}}
   */
  upload: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = await Queue.getFirst();
        const tempPath = await Temp.getTempFolderPath();
        const fileName = path.basename(payload.file);
        const ext = path.extname(fileName);
        const source = path.join(tempPath, fileName).replace(ext, '.mp4');
        const fullPathNoFile = Paths.parseHardsubPath(payload.file);

        for (dest of remote.uploadDestination) {
          const destination = Paths.parseRclonePaths(dest, fullPathNoFile);
          Logger.info(`Uploading to ${destination}`);

          const command = `${Paths.rclonePath} copy "${source}" "${destination}" ${flags.rclone}`;
          await Promisefied.exec(command);
          Logger.success(`Upload completed`);
        }
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject(5);
      }
    });
  },

  /**
   * Get the list of episodes of a folder and return them in an array
   * @param {{Object}} payload - Incoming payload in JSON format
   * @return {{Array}} - Returns an array of episodes of a folder
   */
  getListOfEpisodes: payload => {
    return new Promise(async (resolve, reject) => {
      try {
        let validSource = false;
        for (src of remote.downloadSource) {
          if (await Rclone.checkFolderExists(src, payload)) {
            Logger.success(`Found folder in ${src}`);
            validSource = src;
            break;
          }
        }

        // If folder not found in any source, reject
        if (!validSource) {
          Logger.error(`No sources contained the folder, cancelling operation`);
          reject(6);
          return;
        }

        const source = Paths.parseRclonePaths(validSource, payload.folder);

        Logger.info(`Getting list of episodes from ${source}`);
        const command = `${Paths.rclonePath} lsf "${source}" --files-only -R ${flags.rclone.match(/--config \w+\/\w+\.conf/)}`;
        const response = await Promisefied.exec(command);
        const arrOfEpisodes = response.split('\n').slice(0, -1);
        resolve(arrOfEpisodes);
      }
      catch (e) {
        Logger.error(e);
        reject(7);
      }
    });
  },

  /**
   * Check if a folder exist in a remote storage
   * @param {{string}} source - remote storage name from rclone config
   * @param {{Object}} payload - Incoming payload in JSON format
   * @return {{boolean}}
   */
  checkFolderExists: (source, payload) => {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`Checking for folder in ${source}`);

        const fullPathNoLastFolder = payload.folder.split('/').slice(0, -1).join('/');
        let lastFolder = payload.folder.split('/').pop();
        lastFolder = (lastFolder.endsWith('/')) ? lastFolder : lastFolder + '/';
        source = Paths.parseRclonePaths(source, fullPathNoLastFolder);

        command = `${Paths.rclonePath} lsf "${source}" --dirs-only --include "${lastFolder}" ${flags.rclone.match(/--config \w+\/\w+\.conf/)}`;
        const response = await Promisefied.exec(command);
        if (response === '') resolve(false);
        else resolve(true);
      }
      catch (e) {
        Logger.error(e);
        resolve(false);
      }
    });
  },
};
