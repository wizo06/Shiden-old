#!/bin/bash

FFMPEG_LOGLEVEL=(-loglevel warning)
AUDIO="aac"
THREADS=16

mv "./todo/$2" "./todo/temp.mkv"

echo ""
echo -e "\033[1;33m[$(date +%F_%T)] Encoding $2 with libx265...\033[0m"
./bin/ffmpeg -i "./todo/temp.mkv" -vf subtitles="./todo/temp.mkv" -c:v libx265 -c:a $AUDIO -strict -2 "./done/${2%.mkv}.mp4" "${FFMPEG_LOGLEVEL[@]}"
