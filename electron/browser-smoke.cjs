const { app, BrowserWindow } = require('electron');

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4173';

async function waitForPaint(window) {
  await window.webContents.executeJavaScript(`new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 80)));
  })`);
}

async function waitForText(window, selector, expected) {
  await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    const selector = ${JSON.stringify(selector)};
    const expected = ${JSON.stringify(expected)};
    const deadline = Date.now() + 5000;
    const check = () => {
      if (document.querySelector(selector)?.textContent === expected) return resolve(true);
      if (Date.now() > deadline) return reject(new Error('Timed out waiting for ' + selector + ' = ' + expected));
      setTimeout(check, 25);
    };
    check();
  })`);
}

async function pageHeading(window, route, selector, expected) {
  await window.loadURL(`${baseUrl}${route}`);
  await waitForText(window, selector, expected);
  await waitForPaint(window);
  return window.webContents.executeJavaScript(`({
    pathname: location.pathname,
    heading: document.querySelector(${JSON.stringify(selector)})?.textContent,
    rootHasContent: Boolean(document.querySelector('#root')?.children.length)
  })`);
}

app.whenReady().then(async () => {
  const errors = [];
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.on('console-message', (details) => {
    if (details.level === 'error') errors.push(details.message);
  });

  try {
    const lesson = await pageHeading(window, '/guide/function-calls', '.lesson-header h2', 'Function Calls');
    await window.webContents.reload();
    await waitForText(window, '.lesson-header h2', 'Function Calls');
    await waitForPaint(window);
    const refreshedLesson = await window.webContents.executeJavaScript(`({
      pathname: location.pathname,
      heading: document.querySelector('.lesson-header h2')?.textContent
    })`);
    const lab = await pageHeading(window, '/lab', '.editor-panel h2', 'Assembly Editor');
    const challenges = await pageHeading(window, '/challenges', '.challenges-hero h2', 'ARM64 Challenges');
    const result = { lesson, refreshedLesson, lab, challenges, consoleErrors: errors };
    console.log(JSON.stringify(result));
    const valid = lesson.pathname === '/guide/function-calls'
      && lesson.heading === 'Function Calls'
      && lesson.rootHasContent
      && refreshedLesson.pathname === '/guide/function-calls'
      && refreshedLesson.heading === 'Function Calls'
      && lab.pathname === '/lab'
      && lab.heading === 'Assembly Editor'
      && challenges.pathname === '/challenges'
      && challenges.heading === 'ARM64 Challenges'
      && errors.length === 0;
    app.exit(valid ? 0 : 1);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
