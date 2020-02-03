#!/bin/bash

mkdir -p  "done"

cd "done"

SHOW="Made in Abyss"
SHOW_FULL="Made in Abyss ~ メイドインアビス"
SEASON=""
THREADS=1

SEARCH="../todo"

TOTAL_SIZE=0

for file in "$SEARCH"/*
do
	NAME=$(basename "$file")
	NEWNAME="${NAME::-4}.mp4"	
	echo "Copying over temp files..."
	echo "New file to be named: $NEWNAME"
	cp ../todo/"$NAME" ./"temp.mkv"
	echo "Copy completed."

	: '
	ffmpeg-10bit -i temp.mkv \
		-map 0:v -map 0:2 -map 0:4 -map 0:t? \
		-c:v copy -c:a copy -c:s copy -c:t copy \
		stripped.mkv
	mv stripped.mkv temp.mkv

	mv "temp.mkv" "$NAME"
	echo "Copying Matroska......"
	rclone copy "$NAME" carmilla-kan:Anime/"Premiered"/"$SHOW_FULL"/"$SEASON" -v
	echo "Done copying Matroska"

	mv "$NAME" "temp.mkv"

	echo "Creating MP4 duplicate..."
	ffmpeg -i "temp.mkv" -codec copy -strict -2 "temp.mp4"
	echo "MP4 container created."
	ffmpeg -i "temp.mkv" -codec copy -strict -2 "$NEWNAME"
	'

	# Start conversion process:
	echo "Beginning subtitle burning..."

	ffmpeg -i "temp.mkv" -vf subtitles="temp.mkv" -c:a copy -strict -2 -threads $THREADS -y "$NEWNAME"

	newsize=$(wc -c < "$NEWNAME")
	if [[ "$newsize" == "0" ]]; then
		ffmpeg-10bit -i "temp.mkv" -vf subtitles="temp.mkv" -c:a copy  -strict -2 -threads $THREADS -y "$NEWNAME"
	fi

	newsize=$(wc -c < "$NEWNAME")
	if [[ "$newsize" == "0" ]]; then
		ffmpeg -i "temp.mkv" -filter_complex "[0:v][0:s]overlay[v]" -map "[v]" -map 0:a -c:a copy -strict -2 -threads $THREADS -y "$NEWNAME"
	fi

	newsize=$(wc -c < "$NEWNAME")
	if [[ "$newsize" == "0" ]]; then
		ffmpeg-10bit -i "temp.mkv" -filter_complex "[0:v][0:s]overlay[v]" -map "[v]" -map 0:a -c:a copy -strict -2 -threads $THREADS -y "$NEWNAME"
	fi

	newsize=$(wc -c < "$NEWNAME")
	if [[ "$newsize" == "0" ]]; then
		echo "An error has been detected while converting the video. It seems that there are no subtitles to be burned."
		rm "$NEWNAME"
		exit
	fi

	echo "Subtitle burning completed."
	# End conversion
	##

	echo "Beginning sync..."
	rclone copy "$NEWNAME" TARGET:"Premiered [Hardsub]"/"$SHOW_FULL"/"$SEASON" -v &
	wait
	echo "Completed sync."

	echo "Clearing temp files..."
	rm *
	rm ../todo/"$NAME"
	echo "Files cleared."

done
