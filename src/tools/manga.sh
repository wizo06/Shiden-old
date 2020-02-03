#!/bin/bash

script_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd ${script_path}/../..
mkdir -p plextemp/

MANGA_PATH="/mnt/d/Google Drive/Media/Manga"

# Delete .url files
echo "delete .url"
${script_path}/../../bin/rclone lsf "${MANGA_PATH}" -R --files-only --ignore-case --include "*.url" > plextemp/url.txt
while IFS= read -r file
do
  ${script_path}/../../bin/rclone delete "${MANGA_PATH}/${file}"
done < plextemp/url.txt

# Delete .*_original files
echo "delete .*_original"
${script_path}/../../bin/rclone lsf "${MANGA_PATH}" -R --files-only --ignore-case --include "*_original" > plextemp/original.txt
while IFS= read -r file
do
  ${script_path}/../../bin/rclone delete "${MANGA_PATH}/${file}"
done < plextemp/original.txt

# Print out files that are not images
echo "files not img"
${script_path}/../../bin/rclone lsf "${MANGA_PATH}" -R --files-only --ignore-case --exclude "*.{jpg,png,jpeg,bmp}" > plextemp/files_not_img.txt
sort -n plextemp/files_not_img.txt > plextemp/files_not_img_sorted.txt

# Print out Volume folders that have subfolders inside
echo "volumes with subfolder"
${script_path}/../../bin/rclone lsf "${MANGA_PATH}" -R --dirs-only | grep ".*/.*/.*/.*/" > plextemp/volumes_with_subfolder.txt
sort -n plextemp/volumes_with_subfolder.txt > plextemp/volumes_with_subfolder_sorted.txt

# Print out 単ページ folders
echo "単ページ subfolder"
${script_path}/../../bin/rclone lsf "${MANGA_PATH}" -R --dirs-only | grep "単ページ" > plextemp/single_page_subfolder.txt
sort -n plextemp/single_page_subfolder.txt > plextemp/single_page_subfolder_sorted.txt

# Remove the "title" metadata on all files
echo "exiftool"
exiftool -title="" "${MANGA_PATH}" -r -overwrite_original | grep -v "MicrosoftPhoto\|ThumbnailImage"
