// Import node modules
const path = require('path');
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Paths = require(path.join(process.cwd(), 'src/utils/paths.js'));
const { subtitle } = require(path.join(process.cwd(), 'src/utils/config.js'));

module.exports = Ffprobe = {
  getStreams: async tempFile => {
    return new Promise(async (resolve, reject) => {
      try {
        const command = `${Paths.ffprobePath} -print_format json -show_streams -v quiet -i "${tempFile}"`;
        const response = await Promisefied.exec(command);
        resolve(JSON.parse(response).streams);
      }
      catch (e) {
        Logger.error(e);
        reject();
      }
    });
  },

  getAudioFlags: (streams, payload) => {
    return new Promise(async (resolve, reject) => {
      if (payload.audio_index) {
        Logger.info(`Payload has specified audio stream index: ${payload.audio_index}`);
        const audioStream = streams.filter(stream => stream.index == payload.audio_index)[0];
        if (audioStream.codec_type === 'audio') {
          resolve(`-map 0:${payload.audio_index} -acodec aac -ab 320k`);
        }
        else {
          Logger.error(`Stream with index: ${payload.audio_index} is not an audio stream.`);
          reject();
        }
      }
      else {
        Logger.info(`Looking for Japanese audio stream.`);
        const jpnAAC = streams.filter(stream => {
          if (stream.tags) return stream.codec_name === 'aac' && stream.tags.language === 'jpn';
          else return false;
        })[0];

        const jpnAnyCodec = streams.filter(stream => {
          if (stream.tags) return stream.codec_type === 'audio' && stream.tags.language === 'jpn';
          else return false;
        })[0];

        if (jpnAAC) resolve(`-map 0:${jpnAAC.index} -c:a copy`);
        else if (jpnAnyCodec) resolve(`-map 0:${jpnAnyCodec.index} -acodec aac -ab 320k`);
        else {
          Logger.info(`Did not find Japanese audio stream. Using first available audio stream.`);
          resolve(`-map 0:a -acodec aac -ab 320k`);
        }
      }
    });
  },

  getVideoFlags: (streams, payload) => {
    return new Promise(async (resolve, reject) => {
      if (payload.video_index) {
        Logger.info(`Payload has specified video stream index: ${payload.video_index}`);
        const videoStream = streams.filter(stream => stream.index == payload.video_index)[0];
        if (videoStream.codec_type === 'video') {
          resolve(`-map 0:${payload.video_index} -c:v copy`);
        }
        else {
          Logger.error(`Stream with index: ${payload.video_index} is not a video stream.`);
          reject();
        }
      }
      else {
        const videoStream = streams.filter(stream => stream.codec_type === 'video')[0];
        if (videoStream) resolve(`-map 0:${videoStream.index} -c:v copy`);
        else resolve(`-map 0:v -c:v copy`);
      }
    });
  },

  hasSub: streams => {
    const sub = streams.filter(stream => stream.codec_type === 'subtitle')[0];
    if (sub) {
      Logger.info(`Subtitle stream detected`);
      return true;
    }
    else {
      Logger.info(`Subtitle stream not detected`);
      return false;
    }
  },

  getSubStream: (streams, payload) => {
    if (payload.sub_index) {
      Logger.info(`Payload has specified subtitle index: ${payload.sub_index}`);
      let codecBase = 'default';
      const subStream = streams.filter(stream => stream.index == payload.sub_index)[0];
      if (subStream) {
        if (subStream.codec_name === 'srt' || subStream.codec_name === 'ass') {
          codecBase = 'text';
        }
        else if (subStream.codec_name === 'hdmv_pgs_subtitle') {
          codecBase = 'bitmap';
        }
        else {
          Logger.error(`Stream with index: ${payload.sub_index} is neither text or bitmap based.`);
          console.log(subStream);
        }
      }
      else {
        Logger.error(`Stream with index: ${payload.sub_index} does not exist.`);
      }
      return { codecBase, index: payload.sub_index };
    }

    let codecBase = 'default';
    let index = 's';
    let preferredFound = false;

    for (lang of subtitle.language) {
      // Logger.debug(`Looking for subtitle stream with language ${lang}`);
      const textSubStream = streams.filter(stream => {
        if (stream.tags) {
          const textBasedCodec = (stream.codec_name === 'srt' || stream.codec_name === 'ass');
          const acceptedLang = (stream.tags.language === lang);
          return (textBasedCodec && acceptedLang);
        }
        else {
          return false;
        }
      })[0];
      if (textSubStream) {
        Logger.info(`Preferred subtitle stream found.`);
        Logger.info(`Codec: ${textSubStream.codec_name}`);
        Logger.info(`Language: ${textSubStream.tags.language}`);
        Logger.info(`Index: ${textSubStream.index}`);
        preferredFound = true;
        codecBase = 'text';
        index = textSubStream.index;
        break;
      }

      const bitmapSubStream = streams.filter(stream => {
        if (stream.tags) {
          const textBasedCodec = (stream.codec_name === 'hdmv_pgs_subtitle');
          const acceptedLang = (stream.tags.language === lang);
          return (textBasedCodec && acceptedLang);
        }
        else {
          return false;
        }
      })[0];
      if (bitmapSubStream) {
        Logger.info(`Preferred subtitle stream found.`);
        Logger.info(`Codec: ${bitmapSubStream.codec_name}`);
        Logger.info(`Language: ${bitmapSubStream.tags.language}`);
        Logger.info(`Index: ${bitmapSubStream.index}`);
        preferredFound = true;
        codecBase = 'bitmap';
        index = bitmapSubStream.index;
        break;
      }
    }

    if (!preferredFound) {
      Logger.info(`Preferred subtitle language not found. Looking for first available text based subtitle stream.`, Logger.Colors.Bright);

      const textSubStream = streams.filter(stream => stream.codec_name === 'srt' || stream.codec_name === 'ass')[0];
      if (textSubStream) {
        Logger.info(`Text based subtitle stream found`);
        Logger.info(`Codec: ${textSubStream.codec_name}`);
        if (textSubStream.tags) Logger.info(`Language: ${textSubStream.tags.language}`);
        Logger.info(`Index: ${textSubStream.index}`);
        codecBase = 'text';
        index = textSubStream.index;
      }

      const bitmapSubStream = streams.filter(stream => stream.codec_name === 'hdmv_pgs_subtitle')[0];
      if (bitmapSubStream) {
        Logger.info(`Bitmap based subtitle stream found`);
        Logger.info(`Codec: ${bitmapSubStream.codec_name}`);
        if (bitmapSubStream.tags) Logger.info(`Language: ${bitmapSubStream.tags.language}`);
        Logger.info(`Index: ${bitmapSubStream.index}`);
        codecBase = 'bitmap';
        index = bitmapSubStream.index;
      }
    }

    return { codecBase, index };
  },

};