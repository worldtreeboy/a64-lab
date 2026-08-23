const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: '/lab' });
    const result = await window.webContents.executeJavaScript(`({
      title: document.querySelector('h1')?.textContent,
      registerRows: document.querySelectorAll('.register-row').length,
      editorPresent: Boolean(document.querySelector('textarea')),
      controls: document.querySelectorAll('.control-buttons button').length,
      themes: document.querySelectorAll('.theme-picker option').length
    })`);
    console.log(JSON.stringify(result));
    const valid = result.title === 'A64 Lab'
      && result.registerRows === 33
      && result.editorPresent
      && result.controls === 4
      && result.themes === 3;
    app.exit(valid ? 0 : 1);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
