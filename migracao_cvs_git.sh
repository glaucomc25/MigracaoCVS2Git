#!/bin/bash

CVSROOT="/home/glauco/Prognum/cvs_repo/cvs"

echo "================================="
echo "Executando cvs2git..."
echo "CVSROOT: $CVSROOT"
echo "================================="

cd "$CVSROOT"

cvs2git --encoding=utf8 --fallback-encoding=iso8859-1 \
	--blobfile=/home/glauco/Prognum/git_dat/git-blob.dat \
	--dumpfile=/home/glauco/Prognum/git_dat/git-dump.dat "$CVSROOT"

echo "================================="
echo "Fim da execução cvs2git"
echo "================================="
