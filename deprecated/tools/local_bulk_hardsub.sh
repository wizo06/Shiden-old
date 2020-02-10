#!/bin/bash

script_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FG_CYAN="\033[1;36m"
DEFAULT="\033[0;37m"

######### CHANGE THESE VALUES #########
TODO_PATH="/mnt/d/qBittorrent/todo"
SHOW="Black Bullet"
SUIGEN_PATH="Premiered/Black Bullet ~ ブラック・ブレット"
#######################################

cd "${TODO_PATH}/${SUIGEN_PATH}"

# echo -e "${FG_CYAN}Copying to Suigen${DEFAULT}"
# ${script_path}/../../bin/rclone copy "./" "nt4201_suigen:${SUIGEN_PATH}" --progress --stats-one-line --stats 1s -v --bwlimit 30M

echo -e "${FG_CYAN}Hardsubbing to Suigen${DEFAULT}"
curl -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "show": "'"${SHOW}"'", "file": "'"${SUIGEN_PATH}"'" }' \
  -X POST http://localhost:64000/batch
