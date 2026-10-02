const { app, BrowserWindow } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Permite abrir DevTools em desenvolvimento via atalho (F12 ou Ctrl+Shift+I)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // Diagnóstico e captura de logs do Renderer no terminal principal
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    const lvl = levels[level] || 'LOG'
    console.log(`[Renderer ${lvl}] ${message} (${sourceId}:${line})`)
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(
      `[Renderer ERROR] did-fail-load: code=${errorCode}, desc=${errorDescription}, url=${validatedURL}`,
    )
  })

  win.webContents.on('render-process-gone', (event, details) => {
    console.error(
      `[Renderer CRASH] render-process-gone: reason=${details.reason}, exitCode=${details.exitCode}`,
    )
  })

  win.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error(`[Renderer PRELOAD ERROR] path=${preloadPath}:`, error)
  })

  // Exibir a janela assim que o conteúdo estiver pronto ou via timeout de segurança
  let hasShown = false
  const showWindowSafely = () => {
    if (!hasShown && !win.isDestroyed()) {
      hasShown = true
      win.show()
    }
  }

  win.once('ready-to-show', () => {
    showWindowSafely()
  })

  // Timeout de segurança para evitar janela oculta indefinidamente se ready-to-show demorar
  setTimeout(() => {
    showWindowSafely()
  }, 3000)

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')

  // Garantir que caminhos de assets em dist/index.html estejam com prefixo relativo ./ para file://
  try {
    const fs = require('fs')
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf-8')
      let patched = content
        .replace(/(href|src)=["']\/assets\/([^"']+)["']/g, '$1="./assets/$2"')
        .replace(/(href|src)=["']\/([a-zA-Z0-9_\-.]+\.[a-zA-Z0-9]+)["']/g, '$1="./$2"')

      // Assegurar injeção de __ADTC_OFFLINE_ONLY__ em dist/index.html
      if (!patched.includes('window.__ADTC_OFFLINE_ONLY__ = true')) {
        patched = patched.replace(
          '<head>',
          '<head>\n    <script>window.__ADTC_OFFLINE_ONLY__ = true;</script>',
        )
      }

      if (patched !== content) {
        fs.writeFileSync(indexPath, patched, 'utf-8')
        console.log('[Electron Main] dist/index.html corrigido para caminhos relativos de assets.')
      }
    } else {
      console.error(`[Electron Main] ERRO: Arquivo não encontrado: ${indexPath}`)
    }
  } catch (err) {
    console.warn('[Electron Main] Aviso ao verificar/corrigir dist/index.html:', err)
  }

  const targetUrl = pathToFileURL(indexPath).toString()
  console.log(`[Electron Main] Carregando interface: ${targetUrl}`)
  win.loadURL(targetUrl).catch((err) => {
    console.error('[Electron Main] Falha no win.loadURL:', err)
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
