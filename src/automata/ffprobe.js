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

module.exports = FFprobe = {
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
      if (payload.audioIndex) {
        Logger.info(`Payload has specified audio index: ${payload.audioIndex}`);
        const audioStream = streams.filter(stream => stream.index == payload.audioIndex)[0];
        if (audioStream && audioStream.codec_type === 'audio') {
          return resolve(`-map 0:${payload.audioIndex} -acodec aac -ab 320k`);
        }
        else {
          Logger.error(`Stream with index: ${payload.audioIndex} is not an audio stream or does not exist.`);
          return reject();
        }
      }

      Logger.info(`Audio index not specified in payload`);
      Logger.info(`Looking for stereo audio stream`);
      const stereoAudioStream = streams.filter(stream => stream.channels === 2)[0];
      if (stereoAudioStream) {
        Logger.success(`Stereo audio stream found.`);
        return resolve(`-map 0:${stereoAudioStream.index} -acodec aac -ab 320k`);
      }
      else {
        Logger.error(`Stereo audio stream not found. Using first available audio strema.`);
        return resolve(`-map 0:a -acodec aac -ab 320k`);
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
      if (payload.videoIndex) {
        Logger.info(`Payload has specified video index: ${payload.videoIndex}`);
        const videoStream = streams.filter(stream => stream.index == payload.videoIndex)[0];
        if (videoStream && videoStream.codec_type === 'video') {
          return resolve(`-map 0:${payload.videoIndex} -c:v copy`);
        }
        else {
          Logger.error(`Stream with index: ${payload.videoIndex} is not a video stream or does not exist.`);
          return reject();
        }
      }

      Logger.info(`Video index not specified in payload. Using first available video stream.`);
      return resolve(`-map 0:v -c:v copy`);
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
      Logger.info(`Subtitle stream found`);
      return true;
    }
    else {
      Logger.info(`Subtitle stream not found`);
      return false;
    }
  },

  /**
   * Returns info about the subtitle stream specified in payload.
   * Otherwise returns info about first available subtitle stream.
   * @param {{Array}} streams - Array of streams from temp file
   * @param {{Object}} payload - Incoming payload in JSON format
   * @return {{Object}} - Returns subtitle stream info
   */
  getSubStreamInfo: (streams, payload) => {
    return new Promise((resolve, reject) => {
      if (payload.subIndex) {
        Logger.info(`Payload has specified subtitle index: ${payload.subIndex}`);
        const payloadSpecifiedSubStream = streams.filter(stream => stream.index == payload.subIndex)[0];
        if (payloadSpecifiedSubStream && payloadSpecifiedSubStream.codec_type === 'subtitle') {
          return resolve(payloadSpecifiedSubStream);
        }
        else {
          Logger.error(`Stream with index: ${payload.subIndex} is not a subtitle stream or does not exist.`);
          return reject();
        }
      }

      Logger.info(`Subtitle index not specified in payload. Using first available subtitle stream.`);
      const firstAvailableSubtitleStream = streams.filter(stream => stream.codec_type === 'subtitle')[0];
      return resolve(firstAvailableSubtitleStream);
    });
  },

};
