// Import node modules
const path = require('path');

module.exports = Paths = {
  assetsFolder: path.join(process.cwd(), 'assets'),
  tempFolder: path.join(process.cwd(), 'temp'),
  plexTempFolder: path.join(process.cwd(), 'plextemp'),
  queueFile: path.join(process.cwd(), 'src/queue.json'),
  rclonePath: path.join(process.cwd(), 'bin/rclone'),
  ffmpegPath: path.join(process.cwd(), 'bin/ffmpeg'),
  ffprobePath: path.join(process.cwd(), 'bin/ffprobe'),

  parseRclonePaths: (arg1, arg2) => {
    if (arg1.endsWith(':')) return arg1 += arg2.startsWith('/') ? arg2.slice(1) : arg2;
    else return arg1 = path.join(arg1, arg2);
  },

  parseHardsubPath: (fullPath, fileName) => {
    // Remove filename from path
    let fullPathNoFile = fullPath.replace(fileName, '');

    // Append the string '[Hardsub]' to the topmost folder
    fullPathNoFile = fullPathNoFile.split('/');
    fullPathNoFile = fullPathNoFile.map((currentValue, index) => {
      if (index === 0) {
        if (currentValue === '') {
          currentValue += '[Hardsub]';
        }
        else {
          currentValue += ' [Hardsub]';
        }
      }
      return currentValue;
    });
    fullPathNoFile = fullPathNoFile.join('/');

    return fullPathNoFile;
  },
};
