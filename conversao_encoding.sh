# - converter o encoding dos nomes e salvar tudo em um log.
#   - os nomes estao em Windows-1252 ou ISO-8859-1 e o sistema
#     está interpretando como UTF-8
# - ferramenta usada: convmv (ver arquivo de log)
# obs. poderia ser usado:
#  convmv -f iso-8859-1 -t utf-8 -r "$CVSROOT" ou
#  convmv -f cp1252 -t utf-8 -r "$CVSROOT"


#!/bin/bash

CVSROOT="/home/glauco/Prognum/cvs_repo/cvs"
LOGDIR="/home/glauco/Prognum/tmp_git/logs"
TS=$(date +%Y%m%d_%H%M%S)

mkdir -p "$LOGDIR"

LOG="$LOGDIR/convmv_fix_$TS.log"

echo "================================="
echo "Corrigindo encoding de nomes CVS"
echo "Log: $LOG"
echo "================================="

convmv \
  -r \
  -f windows-1252 \
  -t utf-8 \
  --lowmem \
  --notest \
  "$CVSROOT" \
  > >(tee "$LOG") \
  2> >(tee -a "$LOG" >&2)

echo "================================="
echo "Conversão concluída"
echo "================================="

