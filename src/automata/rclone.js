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
  checkEpisodeExists: (source, payload) => {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`Checking for episode in ${source}`);

        source = Paths.parseRclonePaths(source, payload.full_path);

        command = `${Paths.rclonePath} lsf "${source}" --files-only ${flags.rclone.match(/--config \w+\/\w+\.conf/)}`;
        response = await Promisefied.exec(command);
        Logger.debug(response);
        resolve(true);
      }
      catch (e) {
        Logger.error(e);
        resolve(false);
      }
    });
  },

  download: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = await Queue.getFirst();
        let validSource = false;
        for (src of remote.downloadSource) {
          if (await Rclone.checkEpisodeExists(src, payload)) {
            Logger.info(`Found file in ${src}`, Logger.Colors.FgGreen);
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

        const source = Paths.parseRclonePaths(validSource, payload.full_path);
        const destination = await Temp.getTempFolderPath();

        Logger.info(`Downloading ${source}`);
        const command = `${Paths.rclonePath} copy "${source}" "${destination}" ${flags.rclone}`;
        await Promisefied.exec(command);
        Logger.info(`Download completed`, Logger.Colors.FgGreen);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject(3);
      }
    });
  },

  upload: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = await Queue.getFirst();
        const tempPath = await Temp.getTempFolderPath();
        const fileName = path.basename(payload.full_path);
        const source = path.join(tempPath, fileName).replace(/\.(\w|\d)+$/, '.mp4');

        const fullPathNoFile = Paths.parseHardsubPath(payload.full_path, fileName);

        for (dest of remote.uploadDestination) {
          const destination = Paths.parseRclonePaths(dest, fullPathNoFile);
          Logger.info(`Uploading to ${destination}`);

          const command = `${Paths.rclonePath} copy "${source}" "${destination}" ${flags.rclone}`;
          await Promisefied.exec(command);
          Logger.info(`Upload completed`, Logger.Colors.FgGreen);
        }
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject(5);
      }
    });
  },

  getListOfEpisodes: payload => {
    return new Promise(async (resolve, reject) => {
      try {
        let validSource = false;
        for (src of remote.downloadSource) {
          if (await Rclone.checkFolderExists(src, payload)) {
            Logger.info(`Found folder in ${src}`, Logger.Colors.FgGreen);
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

        const source = Paths.parseRclonePaths(validSource, payload.full_path);

        Logger.info(`Getting list of episodes from ${source}`);
        const command = `${Paths.rclonePath} lsf "${source}" --files-only -R ${flags.rclone.match(/--config \w+\/\w+\.conf/)}`;
        const response = await Promisefied.exec(command);
        const arrOfEpisodes = response.split('\n').slice(0, -1);
        Logger.debug(arrOfEpisodes);
        resolve(arrOfEpisodes);
      }
      catch (e) {
        Logger.error(e);
        reject(7);
      }
    });
  },

  checkFolderExists: (source, payload) => {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`Checking for folder in ${source}`);

        const fullPathNoLastFolder = payload.full_path.split('/').slice(0, -1).join('/');
        let lastFolder = payload.full_path.split('/').pop();
        lastFolder = (lastFolder.endsWith('/')) ? lastFolder : lastFolder + '/';
        source = Paths.parseRclonePaths(source, fullPathNoLastFolder);

        command = `${Paths.rclonePath} lsf "${source}" --dirs-only --include "${lastFolder}" ${flags.rclone.match(/--config \w+\/\w+\.conf/)}`;
        response = await Promisefied.exec(command);
        Logger.debug(response);
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
