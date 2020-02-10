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
  checkFileExists: (source, payload) => {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`Checking for file in ${source}`);

        source = Paths.parseRclonePaths(source, payload.sourceFile);

        const command = `${Paths.rclonePath} lsf "${source}" --files-only ${flags.rclone.match(/--config \w+\/\w+\.conf/)}`;
        await Promisefied.exec(command);
        resolve(true);
      }
      catch (e) {
        Logger.error(`File not found in ${source}`);
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
          if (await Rclone.checkFileExists(src, payload)) {
            Logger.success(`Found file in ${src}`);
            validSource = src;
            break;
          }
        }

        // If file not found in any source, reject
        if (!validSource) {
          Logger.error(`No sources contained the file, cancelling operation`);
          reject(3);
          return;
        }

        const source = Paths.parseRclonePaths(validSource, payload.sourceFile);
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
        const ext = path.extname(payload.sourceFile);
        const source = path.join(tempPath, path.basename(payload.sourceFile.replace(ext, '.mp4')));

        for (dest of remote.uploadDestination) {
          const destination = Paths.parseRclonePaths(dest, payload.destFolder);
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
   * Get the list of files of a folder and return them in an array
   * @param {{Object}} payload - Incoming payload in JSON format
   * @return {{Array}} - Returns an array of files of a folder
   */
  getListOfFiles: payload => {
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
          Logger.error(`Folder not found`);
          reject(6);
          return;
        }

        const source = Paths.parseRclonePaths(validSource, payload.sourceFolder);

        Logger.info(`Getting list of files from ${source}`);
        const command = `${Paths.rclonePath} lsf "${source}" --files-only -R ${flags.rclone.match(/--config \w+\/\w+\.conf/)}`;
        const response = await Promisefied.exec(command);
        const arrOfFiles = response.split('\n').slice(0, -1);
        resolve(arrOfFiles);
      }
      catch (e) {
        Logger.error(e);
        reject();
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

        const fullPathNoLastFolder = payload.sourceFolder.split('/').slice(0, -1).join('/');
        let lastFolder = payload.sourceFolder.split('/').pop();
        lastFolder = (lastFolder.endsWith('/')) ? lastFolder : lastFolder + '/';

        // Escape special characters as documented here https://rclone.org/filtering/
        lastFolder = lastFolder.replace('*', '\\*');
        lastFolder = lastFolder.replace('?', '\\?');
        lastFolder = lastFolder.replace('[', '\\[');
        lastFolder = lastFolder.replace(']', '\\]');
        lastFolder = lastFolder.replace('{', '\\{');
        lastFolder = lastFolder.replace('}', '\\}');

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
