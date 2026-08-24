const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'a64-lab-smoke',
      sandbox: true,
    },
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: '/lab' });
    const result = await window.webContents.executeJavaScript(`(async () => {
      const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const started = Date.now();
      while (!document.querySelector('[aria-label="Simulator example"]')) {
        if (Date.now() - started > 5000) throw new Error('Timed out waiting for the simulator');
        await wait(25);
      }
      const example = document.querySelector('[aria-label="Simulator example"]');
      example.value = 'little-endian';
      example.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(80);
      const step = document.querySelector('.control-buttons .button-primary');
      step.click();
      await wait(40);
      step.click();
      await wait(40);
      step.click();
      await wait(100);
      const theme = document.querySelector('[aria-label="Theme"]');
      const panelStyle = getComputedStyle(document.querySelector('.panel'));
      const ambientStyle = getComputedStyle(document.body, '::before');
      return {
        title: document.querySelector('h1')?.textContent,
        registerRows: document.querySelectorAll('.register-row').length,
        editorPresent: Boolean(document.querySelector('textarea')),
        controls: document.querySelectorAll('.control-buttons button').length,
        themes: document.querySelectorAll('.theme-picker option').length,
        themeOrder: [...theme.options].map((option) => option.textContent),
        selectedTheme: theme.value,
        memoryAddress: document.querySelector('[aria-label="Memory address"]')?.value,
        rawEndianBytes: [...document.querySelectorAll('.last-write-bytes code')].map((node) => node.textContent),
        liveEndianBytes: [...document.querySelectorAll('.dv-byte-strip code')].map((node) => node.textContent),
        activeTheme: document.documentElement.dataset.theme,
        glassBackdrop: panelStyle.backdropFilter,
        ambientAnimation: ambientStyle.animationName,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
      };
    })()`);
    console.log(JSON.stringify(result));
    const valid = result.title === 'A64 Lab'
      && result.registerRows === 33
      && result.editorPresent
      && result.controls === 4
      && result.themes === 3
      && result.themeOrder.join(' | ') === 'Cyberpunk HUD | Debugger | Black / White'
      && result.selectedTheme === 'cyberpunk'
      && result.memoryAddress === '0x400000'
      && result.rawEndianBytes.join(' ') === '88 77 66 55 44 33 22 11'
      && result.liveEndianBytes.join(' ') === '88 77 66 55 44 33 22 11'
      && result.activeTheme === 'cyberpunk'
      && result.glassBackdrop.includes('blur')
      && (result.reducedMotion || result.ambientAnimation.includes('cyber-grid-depth'));
    app.exit(valid ? 0 : 1);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
