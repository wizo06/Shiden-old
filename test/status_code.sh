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

_info "POST /hardsub/file + No authorization"
http_status_code=$(curl -i -s -X POST \
  http://localhost:64000/hardsub/file | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "401" ]; then
  _success "401 returned"
else
  _error "401 not returned"
fi

_info "POST /hardsub/file + No Content-Type"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  http://localhost:64000/hardsub/file | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "415" ]; then
  _success "415 returned"
else
  _error "415 not returned"
fi

_info "POST /hardsub/file + SyntaxError JSON body"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '' \
  http://localhost:64000/hardsub/file | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "400" ]; then
  _success "400 returned"
else
  _error "400 not returned"
fi

_info "POST /hardsub/file + Incomplete JSON body"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "sourceFile": "Premiered/Fate Kaleid/[HorribleSubs] Fate Kaleid Liner PRISMA ILLYA 3rei!! - 01 [1080p].mkv" }' \
  http://localhost:64000/hardsub/file | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "400" ]; then
  _success "400 returned"
else
  _error "400 not returned"
fi

_info "POST /hardsub/file"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "sourceFile": "Premiered/Fate Kaleid/[HorribleSubs] Fate Kaleid Liner PRISMA ILLYA 3rei!! - 01 [1080p].mkv", "destFolder": "Premiered [Hardsub]/Fate Kaleid" }' \
  http://localhost:64000/hardsub/file | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "209" ]; then
  _success "209 returned"
else
  _error "209 not returned"
fi

_info "POST /hardsub/folder"
http_status_code=$(curl -i -s -X POST \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "sourceFolder": "Premiered/Grand Blue", "destFolder": "Premiered [Hardsub]/Grand Blue" }' \
  http://localhost:64000/hardsub/folder | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "209" ]; then
  _success "209 returned"
else
  _error "209 not returned"
fi

_info "GET /queue"
http_status_code=$(curl -i -s -X GET \
  -H "Authorization: authorization_key_1" \
  http://localhost:64000/queue | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "200" ]; then
  _success "200 returned"
else
  _error "200 not returned"
fi

_info "DELETE /queue + string no match"
http_status_code=$(curl -i -s -X DELETE \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "stringMatch": "Premiered/Grand Blue/Grand Blue - 00 [1080p].mkv" }' \
  http://localhost:64000/queue | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "404" ]; then
  _success "404 returned"
else
  _error "404 not returned"
fi

sleep 5

_info "DELETE /queue"
http_status_code=$(curl -i -s -X DELETE \
  -H "Authorization: authorization_key_1" \
  -H "Content-Type: application/json" \
  -d '{ "stringMatch": "Grand Blue" }' \
  http://localhost:64000/queue | grep "HTTP" | cut -d " " -f 2)
if [ "${http_status_code}" == "209" ]; then
  _success "209 returned"
else
  _error "209 not returned"
fi
