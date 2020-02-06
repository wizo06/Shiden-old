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

        const fileName = path.basename(payload.full_path);
        const ext = path.extname(fileName);
        const originalFile = path.join(tempPath, fileName);
        const tempFile = path.join(tempPath, `temp${ext}`);
        const tempPreppedFile = path.join(tempPath, `temp_prepped${ext}`);
        const assFile = path.join(tempPath, `sub.ass`);
        const outputFile = path.join(tempPath, fileName).replace(ext, '.mp4');

        // Rename payload file to temp
        Logger.info(`Renaming file to ${path.basename(tempFile)}`);
        fs.renameSync(originalFile, tempFile);

        // ffprobe
        Logger.info(`[2/4] [1/3] Extracting streams info from ${path.basename(tempFile)}`, Logger.Colors.Bright);
        const streams = await Ffprobe.getStreams(tempFile);

        // Prepare temp_prepped with only video and audio streams
        Logger.info(`[2/4] [2/3] Preparing ${path.basename(tempFile)}`, Logger.Colors.Bright);
        await Ffmpeg.prepare(tempFile, tempPreppedFile, streams, payload);

        // If no subtitle stream
        if (!Ffprobe.hasSub(streams)) {
          // Simply change container
          Logger.info(`[2/4] [3/3] Changing container`, Logger.Colors.Bright);
          await Ffmpeg.changeContainer(tempPreppedFile, outputFile);
        }
        // If subtitle stream exists
        else {
          const subStream = Ffprobe.getSubStream(streams, payload);
          // If it is text based
          switch (subStream.codecBase) {
            case 'text':
              // Extract sub file
              Logger.info(`[2/4] [3/4] Extracting subtitle file`, Logger.Colors.Bright);
              await Ffmpeg.extractSubFile(tempFile, subStream.index, assFile);
              // -vf subtitles=sub.ass
              Logger.info(`[2/4] [4/4] Hardsubbing with text based subtitle`, Logger.Colors.Bright);
              await Ffmpeg.hardsubText(tempPreppedFile, assFile, Paths.assetsFolder, outputFile);
              break;
            case 'bitmap':
              // -filter_complex overlay
              Logger.info(`[2/4] [3/3] Hardsubbing with bitmap based subtitle`, Logger.Colors.Bright);
              await Ffmpeg.hardsubBitmap(tempPreppedFile, tempFile, subStream.index, outputFile);
              break;
            default:
              Logger.error(`Something went wrong. Subtitle stream detected but couldn't be used.`);
              reject(4);
              return;
              break;
          }
        }

        Logger.info(`Hardsubbing completed`, Logger.Colors.FgGreen);
        resolve();
      }
      catch (e) {
        Logger.error(e);
        reject(4);
      }
    });
  },
};
