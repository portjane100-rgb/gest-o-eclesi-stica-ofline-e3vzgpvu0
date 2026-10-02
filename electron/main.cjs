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
  win.once('ready-to-show', () => {
    win.show()
  })
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
  win.loadURL(pathToFileURL(indexPath).toString())
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
