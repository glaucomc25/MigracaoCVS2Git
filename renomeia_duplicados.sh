#!/bin/bash

CVSROOT="/home/glauco/Prognum/cvs_repo/cvs"
LOG="/home/glauco/Prognum/tmp_git/attic_fix.log"

cd "$CVSROOT" || exit 1

find . -path "*/Attic/*,v" -print0 | while IFS= read -r -d '' attic
do
    base=$(basename "$attic")
    parent=$(dirname "$(dirname "$attic")")

    active="$parent/$base"

    if [ -f "$active" ]; then

        newname="${attic%,v}_attic_old,v"

        echo "$attic -> $newname" | tee -a "$LOG"

        mv "$attic" "$newname"

    fi
done
