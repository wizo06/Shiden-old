/**
 * @module ffprobe
 * This module handles the execution of FFprobe commands
 * and provides functions to determine which stream to use
 */

// Import node modules
const path = require('path');
require('toml-require').install({ toml: require('toml') });

// Import custom modules
const Promisefied = require(path.join(process.cwd(), 'src/utils/promisefied.js'));
const Logger = require(path.join(process.cwd(), 'src/utils/logger.js'));
const Paths = require(path.join(process.cwd(), 'src/utils/paths.js'));
const { subtitle } = require(path.join(process.cwd(), 'src/utils/config.js'));

module.exports = Ffprobe = {
  /**
   * FFprobe the temp file and return stream info in an array
   * @param {{string}} tempFile - Path to temp file
   * @return {{Array}} - Return the stream info in an array
   */
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

  /**
   * Determines which audio flag to use for FFmpeg.prepare()
   * @param {{Array}} streams - Array of streams from temp file
   * @param {{Object}} payload - Incoming payload in JSON format
   * @return {{string}} - Returns the audio flag to be used in FFmpeg.prepare()
   */
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

  /**
  * Determines which video flag to use for FFmpeg.prepare()
  * @param {{Array}} streams - Array of streams from temp file
  * @param {{Object}} payload - Incoming payload in JSON format
  * @return {{string}} - Returns the video flag to be used in FFmpeg.prepare()
  */
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

  /**
   * Determines if temp file has subtitle stream or not
   * @param {{Array}} streams - Array of streams from temp file
   * @return {{boolean}}
   */
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

  /**
   * Determines if subtitle stream is text based or bitmap based
   * @param {{Array}} streams - Array of streams from temp file
   * @param {{Object}} payload - Incoming payload in JSON format
   * @return {{codecBase: string, index: number}} - Returns "text" or "bitmap" in codecBase and the index of subtitle stream
   */
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
        if (sub.tags) Logger.info(`Language: ${textSubStream.tags.language ? textSubStream.tags.language : textSubStream.tags.title}`);
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
        if (sub.tags) Logger.info(`Language: ${bitmapSubStream.tags.language ? bitmapSubStream.tags.language : bitmapSubStream.tags.title}`);
        Logger.info(`Index: ${bitmapSubStream.index}`);
        preferredFound = true;
        codecBase = 'bitmap';
        index = bitmapSubStream.index;
        break;
      }
    }

    if (!preferredFound) {
      Logger.info(`Preferred subtitle language not found. Looking for first available subtitle stream.`);
      const sub = streams.filter(stream => stream.codec_type === 'subtitle')[0];
      Logger.info(`Codec: ${sub.codec_name}`);
      if (sub.tags) Logger.info(`Language: ${sub.tags.language ? sub.tags.language : sub.tags.title}`);
      Logger.info(`Index: ${sub.index}`);
      index = sub.index;
    }

    return { codecBase, index };
  },

};
