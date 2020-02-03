/**
 * @fileoverview
 */

// Import node modules
const path = require('path');
const fs = require('fs');
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));
const Ffprobe = require(path.join(process.cwd(), 'src/automata/ffprobe.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Paths = require(path.join(process.cwd(), 'src/utils/paths.js'));

// master will be set to TRUE if current git branch name is 'master'
const master = ('master' === fs.readFileSync(path.join(process.cwd(), '.git/HEAD'), { encoding: 'utf8' }).match(/ref: refs\/heads\/([^\n]+)/)[1]);

module.exports = Ffmpeg = {
  prepare: (tempFile, tempPreppedFile, streams, payload) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!master) Logger.warning(`Running on DEV mode`);
        let command = [`${Paths.ffmpegPath} -i "${tempFile}"`];
        command.push(await Ffprobe.getVideoFlags(streams, payload));
        command.push(await Ffprobe.getAudioFlags(streams, payload));
        command.push(master ? '' : '-t 30');
        command.push(`"${tempPreppedFile}"`);
        command = command.join(' ');
        await Promisefied.exec(command);
        Logger.info(`File has been prepared in ${path.basename(tempPreppedFile)}`, Logger.Colors.Bright);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject();
      }
    });
  },

  changeContainer: (tempPreppedFile, outputFile) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!master) Logger.warning(`Running on DEV mode`);
        let command = [`${Paths.ffmpegPath} -i "${tempPreppedFile}"`];
        command.push(`-c copy`);
        command.push(`-strict -2 -y`);
        command.push(master ? '' : '-t 30');
        command.push(`"${outputFile}"`);
        command = command.join(' ');
        await Promisefied.exec(command);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject();
      }
    });
  },

  extractSubFile: (tempFile, index, assFile) => {
    return new Promise(async (resolve, reject) => {
      try {
        let command = [`${Paths.ffmpegPath} -i "${tempFile}"`];
        command.push(`-map 0:${index}`);
        command.push(`"${assFile}"`);
        command = command.join(' ');
        await Promisefied.exec(command);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject();
      }
    });
  },

  hardsubText: (tempPreppedFile, assFile, assetsFolder, outputFile) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!master) Logger.warning(`Running on DEV mode`);
        let command = [`${Paths.ffmpegPath} -i "${tempPreppedFile}"`];
        command.push(`-vf subtitles=${assFile}:force_style='FontName=NotoSansJP-Medium:fontsdir=${assetsFolder}'`);
        command.push(`-strict -2 -y`);
        command.push(master ? '' : '-t 30');
        command.push(`"${outputFile}"`);
        command = command.join(' ');
        await Promisefied.exec(command);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject();
      }
    });
  },

  hardsubBitmap: (tempPreppedFile, tempFile, index, outputFile) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!master) Logger.warning(`Running on DEV mode`);
        let command = [`${Paths.ffmpegPath} -i "${tempPreppedFile}" -i "${tempFile}"`];
        command.push(`-filter_complex "[0:v][1:${index}]overlay[v]"`);
        command.push(`-map "[v]"`);
        command.push(`-strict -2 -y`);
        command.push(master ? '' : '-t 30');
        command.push(`"${outputFile}"`);
        command = command.join(' ');
        await Promisefied.exec(command);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject();
      }
    });
  },
};
