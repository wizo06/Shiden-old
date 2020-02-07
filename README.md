# About
Shiden (紫電), meaning "purple lightning" in Japanese, is a web server (built with **ExpressJS**) that facilitates the automation of hardsubbing video files using **ffmpeg**.
It downloads from and uploads to remote/local storages using **rclone**.

# Table of contents
- [Features](#features)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
  - [Configure](#configure)
  - [Start up Shiden](#start-up-shiden)
- [Usage](#usage)
  - [GET](#GET)
    - /queue
  - [POST](#POST)
    - /hardsub/file
    - /hardsub/folder
  - [DELETE](#DELETE)
    - /queue

# Features
- Queue system. First come first serve basis.
- HTTP response with the appropriate error status code and message.
- Able to process the following scenarios:
  - Videos that don't have subtitle stream: Simply change container to MP4
  - Videos that have Text based subtitle stream: Use `-vf subtitle=sub.ass`
  - Videos that have Bitmap based subtitle stream: Use `-filter_complex overlay`
  - **Note**: If the file has both text based and bitmap based subtitle streams, text based stream will be prioritized over bitmap based
- Option to specify stream index for video, audio and/or subtitle
- Language priority for subtitles when deciding which subtitle stream to use for hardsubbing
- Discord notification with webhooks

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
  "start": "node src/server.js"
}
```
then `node src/server.js --clean` => `npm start -- --clean`.

- Here is the [pull request](https://github.com/npm/npm/pull/5518) for this feature.
- [Official documentation](https://docs.npmjs.com/cli/run-script) of this feature.
- Or run `npm help run` to see the documentation in the terminal.

# Usage

## GET

### `/queue`
  - Returns the current queue in an array.

## POST

### `/hardsub/file`
  - Queue up **one file**.
  - `Content-Type` must be `application/json`
  - `Authentication` must have a valid token (from `user_auth.yml`)
  - The JSON in the body should look like this
  ```json
  {
      "full_path": "Airing/SHOW NAME/SEASON 1/FILE NAME.MKV",
      "show": "SHOW NAME",
      "video_index": 0,
      "audio_index": 1,
      "sub_index": 2
  }
  ```  

| Field | Required | Description |
| --- | --- | --- |
| full_path | Yes | Used to attempt download and upload. **The first folder will be appended with string "[Hardsub]" (without the quotes) when uploading.** (e.g. `Airing [Hardsub]/SHOW NAME/SEASON 1/FILE NAME.MKV`)  |
| show | No | Used for metadata when sending out notifications |
| video_index | No | Stream index number that will be used for video |
| audio_index | No | Stream index number that will be used for audio |
| sub_index | No | Stream index number that will be used for subtitle |


### `/hardsub/folder`
  - Queue up **all files of a folder**.
  - `Content-Type` must be `application/json`
  - `Authentication` must have a valid token (from `user_auth.yml`)
  - The JSON in the body should look like this
  ```json
  {
      "full_path": "Airing/SHOW NAME/SEASON 1",
      "show": "SHOW NAME",
      "video_index": 0,
      "audio_index": 1,
      "sub_index": 2
  }
  ```  

| Field | Required | Description |
| --- | --- | --- |
| full_path | Yes | Used to attempt download and upload. **The first folder will be appended with string "[Hardsub]" (without the quotes) when uploading.** (e.g. `Airing [Hardsub]/SHOW NAME/SEASON 1`) |
| show | No | Used for metadata when sending out notifications |
| video_index | No | Stream index number that will be used for video |
| audio_index | No | Stream index number that will be used for audio |
| sub_index | No | Stream index number that will be used for subtitle |

## DELETE

### `/queue`
  - Delete **all payloads** in the queue that **matches the provided string** **EXCEPT** if the payload is **first element in queue**
  - `Content-Type` must be `application/json`
  - `Authentication` must have a valid token (from `user_auth.yml`)
  - The JSON in the body should look like this
  ```json
  {
      "full_path": "string used for matching"
  }
  ```
Specifically, [`String.prototype.includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) is used. For example, if the queue has the following payloads:
```json
[
  {
    "show": "...",
    "full_path": "Grand Blue/Grand Blue - 03 [1080p].mkv"
  },
  {
    "show": "...",
    "full_path": "Grand Blue/Grand Blue - 01 [1080p].mkv"
  },
  {
    "show": "...",
    "full_path": "3-gatsu no Lion/3-gatsu no Lion - 01 [1080p].mkv"
  },
  {
    "show": "...",
    "full_path": "Grand Blue/Grand Blue - 02 [1080p].mkv"
  }
]
```
and your request looks like this:
```json
{
  "full_path": "Blue"
}
```
it will delete these two payloads from the queue:
```
Grand Blue - 01 [1080p].mkv
Grand Blue - 02 [1080p].mkv
```
**NOTE** that `Grand Blue - 03 [1080p].mkv` will not be deleted in this case because it is the first element in the queue.