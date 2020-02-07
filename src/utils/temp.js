/**
 * @module temp
 * This module handles the "temp" folder
 */

// Import node modules
const fs = require('fs');
const path = require('path');

// Import custom modules
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Paths = require(path.join(process.cwd(), 'src/utils/paths.js'));

module.exports = Temp = {
  /**
   * @return {{string}} - Returns a string with the absolute path to the "temp" folder
   */
  getTempFolderPath: () => {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(Paths.tempFolder)) {
        Logger.debug(`Creating temp/`);
        fs.mkdirSync(Paths.tempFolder, { recursive: true });
      }
      resolve(Paths.tempFolder);
    });
  },

  /**
   * Delete all files in "temp" folder with fs.unlinkSync()
   * @return {{void}}
   */
  destroy: () => {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.debug(`Emptying temp/`);
        const tempFolderPath = await Temp.getTempFolderPath();
        const files = fs.readdirSync(tempFolderPath);
        for (file of files) {
          fs.unlinkSync(path.join(tempFolderPath, file));
        }
        resolve();
      }
      catch (e) {
        reject();
      }
    });
  },
};
