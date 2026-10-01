#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HTML_FILE="$DIR/index.html"

# 1. Tentar Google Chrome em modo aplicativo dedicado no macOS
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" --args --app="file://$HTML_FILE" --allow-file-access-from-files --disable-web-security
  exit 0
fi

# 2. Tentar Microsoft Edge em modo aplicativo dedicado no macOS
if [ -d "/Applications/Microsoft Edge.app" ]; then
  open -a "Microsoft Edge" --args --app="file://$HTML_FILE" --allow-file-access-from-files --disable-web-security
  exit 0
fi

# 3. Tentar Brave Browser
if [ -d "/Applications/Brave Browser.app" ]; then
  open -a "Brave Browser" --args --app="file://$HTML_FILE" --allow-file-access-from-files --disable-web-security
  exit 0
fi

# 4. Fallback para o navegador padrao
open "$HTML_FILE"
exit 0
