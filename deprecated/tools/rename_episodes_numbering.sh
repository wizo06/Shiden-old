#!/bin/bash

MANGA_PATH="/mnt/d/Google Drive/Media/Manga"
SRC="${MANGA_PATH}/Kawaiikereba Hentai demo Suki ni Natte Kuremasu ka ~ 可愛いければ変態でも好きになってくれますか？/JPN/第01巻/5_files"

script_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FG_CYAN="\033[1;36m"
FG_YELLOW="\033[1;33m"
FG_GREEN="\033[1;32m"
DEFAULT="\033[0;37m"

cd ${script_path}/../..
mkdir -p plextemp/

echo -e "${FG_CYAN}lsf src:${DEFAULT}"
${script_path}/../../bin/rclone lsf "${SRC}" --files-only > plextemp/files.txt

COUNTER=105
while IFS= read -r file
do
  EXT="${file##*.}"
  if [ "${COUNTER}" -lt "10" ]; then
    NEW_NAME="00$((COUNTER++)).${EXT}"
  elif [ "${COUNTER}" -lt "100" ]; then
    NEW_NAME="0$((COUNTER++)).${EXT}"
  else
    NEW_NAME="$((COUNTER++)).${EXT}"
  fi
  echo -e "${FG_YELLOW}${file}${DEFAULT} => ${FG_GREEN}${NEW_NAME}${DEFAULT}"
  ${script_path}/../../bin/rclone moveto "${SRC}/${file}" "${SRC}/${NEW_NAME}" --progress --stats-one-line --stats 1s -v
done < plextemp/files.txt
