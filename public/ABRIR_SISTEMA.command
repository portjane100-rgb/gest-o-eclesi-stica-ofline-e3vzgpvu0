#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HTML_FILE="$DIR/index.html"

# 1. Tentar Google Chrome em modo app no macOS
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" --args --app="file://$HTML_FILE"
  exit 0
fi

# 2. Tentar Microsoft Edge em modo app no macOS
if [ -d "/Applications/Microsoft Edge.app" ]; then
  open -a "Microsoft Edge" --args --app="file://$HTML_FILE"
  exit 0
fi

# 3. Fallback navegador padrão
open "$HTML_FILE"
exit 0
