const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const isDevelopment = !app.isPackaged;
const developmentOrigin = 'http://127.0.0.1:5173';
const productionIndex = path.join(__dirname, '..', 'dist', 'index.html');

function isAllowedNavigation(url) {
  try {
    if (isDevelopment) return new URL(url).origin === developmentOrigin;
    return url.split('#')[0] === pathToFileURL(productionIndex).toString();
  } catch {
    return false;
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#0b0f16',
    title: 'A64 Lab',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) event.preventDefault();
  });
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  if (isDevelopment) {
    window.loadURL(developmentOrigin);
  } else {
    window.loadFile(productionIndex);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
