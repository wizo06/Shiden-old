#!/bin/bash

MANGA_PATH="/mnt/d/Google Drive/Media/Manga"
SRC="${MANGA_PATH}/Naruto ~ ナルト/ENG/Databook"

script_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FG_CYAN="\033[1;36m"
FG_YELLOW="\033[1;33m"
FG_GREEN="\033[1;32m"
DEFAULT="\033[0;37m"

cd ${script_path}/../..
mkdir -p plextemp/

${script_path}/../../bin/rclone lsf "${SRC}" -R --files-only > plextemp/files.txt

while IFS= read -r file
do
  mv "${SRC}/${file}" "${SRC}"
done < plextemp/files.txt
