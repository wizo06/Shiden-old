/**
 * @module encoder
 * This module handles the logic of choosing which FFmpeg command should be used
 * for incoming files. It uses FFprobe to probe the info of the file.
 */

// Import node modules
const fs = require('fs');
const path = require('path');
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Temp = require(path.join(process.cwd(), 'src/utils/temp.js'));
const Queue = require(path.join(process.cwd(), 'src/utils/queue.js'));
const Ffprobe = require(path.join(process.cwd(), 'src/automata/ffprobe.js'));
const Ffmpeg = require(path.join(process.cwd(), 'src/automata/ffmpeg.js'));
const Paths = require(path.join(process.cwd(), 'src/utils/paths.js'));

module.exports = Encoder = {
  encode: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = await Queue.getFirst();
        const tempPath = await Temp.getTempFolderPath();

        const fileName = path.basename(payload.file);
        const ext = path.extname(fileName);
        const originalFile = path.join(tempPath, fileName);
        const tempFile = path.join(tempPath, `temp${ext}`);
        const tempPreppedFile = path.join(tempPath, `temp_prepped${ext}`);
        const assFile = path.join(tempPath, `sub.ass`);
        const outputFile = path.join(tempPath, fileName).replace(ext, '.mp4');

        // Step 1: Rename file to temp
        Logger.info(`Renaming file to ${path.basename(tempFile)}`);
        fs.renameSync(originalFile, tempFile);

        // Step 2: FFprobe to extract info from file
        Logger.info(`Extracting streams info from ${path.basename(tempFile)}`);
        const streams = await Ffprobe.getStreams(tempFile);

        // Step 3: Extract video and audio streams into temp_prepped
        Logger.info(`Preparing ${path.basename(tempFile)}`);
        await Ffmpeg.prepare(tempFile, tempPreppedFile, streams, payload);

        if (!Ffprobe.hasSub(streams)) {
          // Step 4: If no subtitle stream, simply change container
          Logger.info(`Changing container`);
          await Ffmpeg.changeContainer(tempPreppedFile, outputFile);
        }
        else {
          const subStream = Ffprobe.getSubStreamInfo(streams, payload);
          Logger.info(subStream);

          try {
            // First attempt with text based hardsub
            Logger.info(`Trying with text based hardsub`);

            // Step 4.1: If it is text based, extract subtitle stream into sub.ass
            Logger.info(`Extracting subtitle file`);
            await Ffmpeg.extractSubFile(tempFile, subStream.index, assFile);

            // Step 4.2: Hardsub temp_prepped with -vf subtitles=sub.ass
            Logger.info(`Hardsubbing with text based subtitle`);
            await Ffmpeg.hardsubText(tempPreppedFile, assFile, Paths.assetsFolder, outputFile);
          }
          catch (e) {
            try {
              // If text based hardsub fails, attempt again with bitmap based hardsub
              Logger.error(`Failed with text based hardsub`);
              Logger.info(`Trying with bitmap based hardsub`);

              // Step 4.1: Hardsub temp_prepped with -filter_complex overlay
              Logger.info(`Hardsubbing with bitmap based subtitle`);
              await Ffmpeg.hardsubBitmap(tempPreppedFile, tempFile, subStream.index, outputFile);
            }
            catch (e) {
              reject(4);
              return;
            }
          }
        }

        Logger.success(`Hardsubbing completed`);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject(4);
      }
    });
  },
};
