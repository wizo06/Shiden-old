# About
Shiden (紫電), meaning "purple lightning" in Japanese, is a web server (built with **ExpressJS**) that facilitates the automation of hardsubbing video files using **ffmpeg**.
It downloads from and uploads to remote/local storages using **rclone**.

# Table of contents
- [Features](#features)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
  - [External connection](#external-connection)
  - [Config](#config)
  - [Start up the server](#start-up-the-server)
- [Usage](#usage)
  - [GET](#GET)
    - /
  - [POST](#POST)
    - [/encode](#encode)
    - [/batch](#batch)

# Features
- Queue system. First come first serve basis.
- Prevention of duplicate payloads in queue. (only works for `/encode` endpoint)
- HTTP response with the appropriate error status code and message.
- Able to process the following scenarios:
  - Videos that don't have subtitle stream: Simply change container to MP4
  - Videos that have Text based subtitle stream: Use `-vf subtitle=sub.ass`
  - Videos that have Bitmap based subtitle stream: Use `-filter_complex overlay`
  - **Note**: If the file has both text based and bitmap based subtitle streams, text based stream will be prioritized over bitmap based
- Option to specify stream index for video, audio and/or subtitle
- Language priority for subtitles when deciding which subtitle stream to use for hardsubbing
- Discord notification with webhooks

# TODO
- [ ] Option to specify Fontstyle for text based subtitles
- [ ] (maybe?) Refactor to use Task Queue (either [Bee-Queue](https://github.com/bee-queue/bee-queue) or [Bull](https://github.com/OptimalBits/bull))

# Requirements
- x86_64 CPU architecture
- \*nix OS
- curl
- tar
- unzip
- Node.js
- npm

# Getting Started

## Configure
1. Run 
```bash
./prepare.sh
```

2. Make the necessary changes in those `conf/user_*` files.

## Start up Shiden
```bash
npm start
```

Alternatively, if you want to start up Shiden and remove any leftover payload in the queue.
```bash
npm start -- --clean
```
**Note** the `--` after `npm start` is necessary. This is how you pass arguments to `npm`. If your `package.json` looks like this:
```json
"scripts": {
  "start": "node src/app.js"
}
```
then `node src/app.js --clean` => `npm start -- --clean`.

- Here is the [pull request](https://github.com/npm/npm/pull/5518) for this feature.
- [Official documentation](https://docs.npmjs.com/cli/run-script) of this feature.
- Or run `npm help run` to see the documentation in the terminal.

# Usage

## GET

### `/`
  - Returns the current queue in an array.

## POST

### `/encode`
  - Queue up **one file**.
  - `Content-Type` must be `application/json`
  - `Authentication` must have a valid token (from `user_auth.yml`)
  - The JSON in the body should look like this
  ```json
  {
      "show": "SHOW NAME",
      "full_path": "Airing/SHOW NAME/SEASON 1/FILE NAME.MKV",
      "video_index": 0,
      "audio_index": 1,
      "sub_index": 2
  }
  ```  

| Field | Required | Description |
| --- | --- | --- |
| show | Yes | Used for metadata when sending out notifications |
| full_path | Yes | Used to attempt download and upload |
| video_index | No | Stream index number that will be used for video |
| audio_index | No | Stream index number that will be used for audio |
| sub_index | No | Stream index number that will be used for subtitle |


### `/batch`
  - Queue up **all files of a folder**.
  - `Content-Type` must be `application/json`
  - `Authentication` must have a valid token (from `user_auth.yml`)
  - The JSON in the body should look like this
  ```json
  {
      "show": "SHOW NAME",
      "full_path": "Airing/SHOW NAME/SEASON 1",
      "video_index": 0,
      "audio_index": 1,
      "sub_index": 2
  }
  ```  

| Field | Required | Description |
| --- | --- | --- |
| show | Yes | Used for metadata when sending out notifications |
| full_path | Yes | Used to attempt download and upload |
| video_index | No | Stream index number that will be used for video |
| audio_index | No | Stream index number that will be used for audio |
| sub_index | No | Stream index number that will be used for subtitle |