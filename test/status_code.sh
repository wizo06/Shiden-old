#!/bin/bash

BLACK="\033[0;30m"
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
MAGENTA="\033[0;35m"
CYAN="\033[0;36m"
DEFAULT="\033[0;37m"
DARK_GRAY="\033[1;30m"
FG_RED="\033[1;31m"
FG_GREEN="\033[1;32m"
FG_YELLOW="\033[1;33m"
FG_BLUE="\033[1;34m"
FG_MAGENTA="\033[1;35m"
FG_CYAN="\033[1;36m"
FG_WHITE="\033[1;37m"

_success () {
  echo -e "${FG_GREEN}✔ ${FG_WHITE}${1}${DEFAULT}"
}

_info () {
  echo -e "${FG_CYAN}i ${FG_WHITE}${1}${DEFAULT}"
}

_warning () {
  echo -e "${FG_YELLOW}✖ ${FG_WHITE}${1}${DEFAULT}"
}

_error () {
  echo -e "${FG_RED}✖ ${FG_WHITE}${1}${DEFAULT}"
}

_info "POST /encode + No authorization"
http_status_code=$(curl -i -s -X POST \
  -H "Content-Type: application/json" \
  -d '{ "show": "Fate Kaleid", "full_path": "Premiered/Fate Kaleid/[HorribleSubs] Fate Kaleid Liner PRISMA ILLYA 3rei!! - 01 [1080p].mkv" }' \
  http://localhost:64000/encode | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "401" ]; then
  _success "401 returned"
else
  _error "401 not returned"
fi

_info "POST /encode + No Content-Type"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -d '{ "show": "Fate Kaleid", "full_path": "Premiered/Fate Kaleid/[HorribleSubs] Fate Kaleid Liner PRISMA ILLYA 3rei!! - 01 [1080p].mkv" }' \
  http://localhost:64000/encode | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "415" ]; then
  _success "415 returned"
else
  _error "415 not returned"
fi

_info "POST /encode + Incomplete JSON body"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "full_path": "Premiered/Fate Kaleid/[HorribleSubs] Fate Kaleid Liner PRISMA ILLYA 3rei!! - 01 [1080p].mkv" }' \
  http://localhost:64000/encode | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "400" ]; then
  _success "400 returned"
else
  _error "400 not returned"
fi

_info "POST /encode"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "show": "Fate Kaleid", "full_path": "Premiered/Fate Kaleid/[HorribleSubs] Fate Kaleid Liner PRISMA ILLYA 3rei!! - 01 [1080p].mkv" }' \
  http://localhost:64000/encode | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "209" ]; then
  _success "209 returned"
else
  _error "209 not returned"
fi

_info "POST /encode + Duplicate"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "show": "Fate Kaleid", "full_path": "Premiered/Fate Kaleid/[HorribleSubs] Fate Kaleid Liner PRISMA ILLYA 3rei!! - 01 [1080p].mkv" }' \
  http://localhost:64000/encode | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "409" ]; then
  _success "409 returned"
else
  _error "409 not returned"
fi

_info "POST /batch"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "show": "Grand Blue", "full_path": "Premiered/Grand Blue" }' \
  http://localhost:64000/batch | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "209" ]; then
  _success "209 returned"
else
  _error "209 not returned"
fi