#!/bin/bash

script_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd ${script_path}/../..
mkdir -p plextemp/

echo "rclone lsf softsub"
${script_path}/../../bin/rclone lsf "suigen:Premiered" -R --files-only --exclude "{1,2,3,4,5,6,7,8,9,0,Bleach}**/**" > plextemp/softsub.txt
echo "rclone lsf hardsub"
${script_path}/../../bin/rclone lsf "suigen:Premiered [Hardsub]" -R --files-only --exclude "{1,2,3,4,5,6,7,8,9,0,Bleach}**/**" > plextemp/hardsub.txt

# Remove extension from files
echo "Removing extension"
sed 's/.mkv$//' -i plextemp/softsub.txt
sed 's/.mp4$//' -i plextemp/hardsub.txt

# Sort before comm
echo "Sorting"
sort -n plextemp/softsub.txt > plextemp/softsub_sorted.txt
sort -n plextemp/hardsub.txt > plextemp/hardsub_sorted.txt

# Extract files in softsub_sorted_no_extension that are NOT in hardsub_sorted_no_extension
echo "Comparing"
comm -23 plextemp/softsub_sorted.txt plextemp/hardsub_sorted.txt > plextemp/diff.txt
