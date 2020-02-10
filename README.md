# About
Shiden (紫電), meaning "purple lightning" in Japanese, is a web server (built with **ExpressJS**) that facilitates the automation of hardsubbing video files using **ffmpeg**.
It downloads from and uploads to remote/local storages using **rclone**.

# Table of contents
- [Features](#features)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
  - [Configure](#configure)
  - [Start up Shiden](#start-up-shiden)
- [Routes](#routes)
  - [/hardsub/file](#hardsubfile)
    - POST
  - [/hardsub/folder](#hardsubfolder)
    - POST
  - [/queue](#queue)
    - DELETE
    - GET

# Features
- Queue system. First come first serve basis.
- HTTP response with the appropriate error status code and message.
- Able to process the following scenarios:
  - Videos that don't have subtitle stream: Simply change container to MP4
  - Videos that have Text based subtitle stream: Use `-vf subtitle=sub.ass`
  - Videos that have Bitmap based subtitle stream: Use `-filter_complex overlay`
  - **Note**: If the file has both text based and bitmap based subtitle streams, text based stream will be prioritized over bitmap based
- Option to specify stream index for video, audio and/or subtitle
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

# Routes

## `/hardsub/file`

### POST
  - Queue up **one file**.
  - `Content-Type` must be `application/json`
  - `Authentication` must have a valid token (from `user_auth.yml`)
  - Example of request body
  ```json
  {
      "sourceFile": "TODO/FILE NAME.MKV",
      "destFolder": "DONE",
  }
  ```  

| Field | Required | Type | Default | Description |
| --- | --- | --- | --- | --- |
| sourceFile | Yes | String | | Full path of the source file in the remote storage that rclone will download from |
| destFolder | Yes | String | | Full path of the destination folder in the remote storage that rclone will upload to |
| showName | No | String | | Name of the show used for metadata when sending out notifications |
| videoIndex | No | Number | First available | Stream index number that will be used for video |
| audioIndex | No | Number | First available | Stream index number that will be used for audio |
| subIndex | No | Number | First available | Stream index number that will be used for subtitle |
| fontStyle | No | String | NotoSansJP-Medium | Font style used for text based hardsub |

[List of available font styles](https://github.com/wizo06/Shiden/tree/master/assets)

## `/hardsub/folder`

### POST
  - Queue up **all files of a folder**.
  - `Content-Type` must be `application/json`
  - `Authentication` must have a valid token (from `user_auth.yml`)
  - Example of request body
  ```json
  {
      "sourceFolder": "TODO",
      "destFolder": "DONE",
  }
  ```  

| Field | Required | Type | Default | Description |
| --- | --- | --- | --- | --- |
| sourceFolder | Yes | String | | Full path of the source folder in the remote storage that rclone will download from |
| destFolder | Yes | String | | Full path of the destination folder in the remote storage that rclone will upload to |
| showName | No | String | | Name of the show used for metadata when sending out notifications |
| videoIndex | No | Number | First available | Stream index number that will be used for video |
| audioIndex | No | Number | First available | Stream index number that will be used for audio |
| subIndex | No | Number | First available | Stream index number that will be used for subtitle |
| fontStyle | No | String | NotoSansJP-Medium | Font style used for text based hardsub |

[List of available font styles](https://github.com/wizo06/Shiden/tree/master/assets)

## `/queue`

### DELETE
  - Delete **all payloads** in the queue that **matches the provided string** **EXCEPT** if the payload is **first element in queue**
  - `Content-Type` must be `application/json`
  - `Authentication` must have a valid token (from `user_auth.yml`)
  - Example of request body
  ```json
  {
      "stringMatch": "lorem ipsum"
  }
  ```

  | Field | Required | Type | Default | Description |
  | --- | --- | --- | --- | --- |
  | stringMatch | Yes | String | | String used for matching against `sourceFile` key in payload |

Specifically, [`String.prototype.includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) is used. For example, if the queue has the following payloads:
```json
[
  {
    "sourceFile": "Grand Blue/Grand Blue - 03 [1080p].mkv",
    "destFolder": "Grand Blue [Hardsub]"
  },
  {
    "sourceFile": "Grand Blue/Grand Blue - 01 [1080p].mkv",
    "destFolder": "Grand Blue [Hardsub]"
  },
  {
    "sourceFile": "3-gatsu no Lion/3-gatsu no Lion - 01 [1080p].mkv",
    "destFolder": "3-gatsu no Lion [Hardsub]"
  },
  {
    "sourceFile": "Some folder/original.mkv",
    "destFolder": "Grand Blue [Hardsub]"
  }
]
```
and your request looks like this:
```json
{
  "stringMatch": "Blue"
}
```
it will only delete this payload from the queue:
```
Grand Blue - 01 [1080p].mkv
```
**NOTE** that `Grand Blue - 03 [1080p].mkv` will not be deleted in this case because it is the first element in the queue.  
**NOTE** that `original.mkv` will not be deleted in this case because the `sourceFile` key does not match with `Blue`.  

### GET
  - Returns the current queue in an array.
