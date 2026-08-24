const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const captureDocs = process.env.A64_CAPTURE_DOCS === '1';
const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

async function waitForPaint(window) {
  await window.webContents.executeJavaScript(`new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 80)));
  })`);
}

async function waitForRouteContent(window, route) {
  const selector = route.startsWith('/guide/')
    ? '.lesson-section p'
    : route === '/challenges'
      ? '.challenge-card'
      : '.register-row';
  await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (document.querySelector(${JSON.stringify(selector)})) return resolve();
      if (Date.now() - started > 5000) return reject(new Error('Timed out waiting for ${selector}'));
      setTimeout(check, 25);
    };
    check();
  })`);
}

async function loadRoute(window, route) {
  await window.loadFile(distIndex, { hash: route });
  await waitForRouteContent(window, route);
  await waitForPaint(window);
}

app.whenReady().then(async () => {
  const errors = [];
  const window = new BrowserWindow({
    show: false,
    width: 1600,
    height: 1000,
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
    await loadRoute(window, '/guide/registers');
    await window.webContents.executeJavaScript(`document.querySelector('.guide-main')?.scrollTo({ top: 240, behavior: 'instant' })`);
    await waitForPaint(window);
    const guide = await window.webContents.executeJavaScript(`({
      route: location.hash,
      title: document.querySelector('.lesson-header h2')?.textContent,
      lessons: document.querySelectorAll('.lesson-list a').length,
      stages: document.querySelectorAll('.lesson-stage').length,
      sections: document.querySelectorAll('.lesson-section').length,
      diagrams: document.querySelectorAll('.concept-diagram').length,
      examples: document.querySelectorAll('.assembly-example').length,
      quizQuestions: document.querySelectorAll('.lesson-quiz .prediction-card').length,
      numberedQuestions: [...document.querySelectorAll('.lesson-quiz .prediction-card > .eyebrow')]
        .map((element) => element.textContent),
      completionLocked: document.querySelector('.lesson-finish button:last-child')?.disabled === true,
      mentalModel: Boolean(document.querySelector('.lesson-mental-model')),
      walkthrough: Boolean(document.querySelector('.state-walkthrough')),
      liveVisualizer: Boolean(document.querySelector('.live-lesson-demo .dynamic-visualizer')),
      focusedVisualizer: Boolean(document.querySelector('.live-lesson-demo [data-testid="dynamic-context"]')),
      spacedParagraph: Number.parseFloat(getComputedStyle(document.querySelector('.lesson-section p')).marginBottom) >= 10,
      scrollable: (() => {
        const pane = document.querySelector('.guide-main');
        return Boolean(pane && pane.scrollHeight > pane.clientHeight && pane.scrollTop > 0 && getComputedStyle(pane).overflowY === 'auto');
      })(),
      scrollMetrics: (() => {
        const pane = document.querySelector('.guide-main');
        const layout = document.querySelector('.guide-layout');
        return pane && layout ? {
          paneClient: pane.clientHeight,
          paneScroll: pane.scrollHeight,
          paneOverflow: getComputedStyle(pane).overflowY,
          layoutClient: layout.clientHeight,
          pageHeight: document.querySelector('.learning-page')?.getBoundingClientRect().height
        } : null;
      })(),
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    })`);
    if (captureDocs) {
      await loadRoute(window, '/guide/stack');
      const image = await window.webContents.capturePage();
      fs.writeFileSync(path.join(__dirname, '..', 'docs', 'a64-guide.png'), image.toPNG());
    }

    await loadRoute(window, '/challenges');
    const challenges = await window.webContents.executeJavaScript(`({
      route: location.hash,
      cards: document.querySelectorAll('.challenge-card').length,
      categories: document.querySelectorAll('.challenge-filters button').length,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    })`);

    await loadRoute(window, '/lab');
    if (captureDocs) {
      for (let index = 0; index < 3; index += 1) {
        await window.webContents.executeJavaScript(`document.querySelector('.control-buttons button:last-child')?.click()`);
        await waitForPaint(window);
      }
      const image = await window.webContents.capturePage();
      fs.writeFileSync(path.join(__dirname, '..', 'docs', 'a64-lab.png'), image.toPNG());
    }
    const lab = await window.webContents.executeJavaScript(`({
      route: location.hash,
      registers: document.querySelectorAll('.register-row').length,
      controls: document.querySelectorAll('.control-buttons button').length,
      liveVisualizer: Boolean(document.querySelector('.learning-sidebar .dynamic-visualizer'))
    })`);

    window.setSize(320, 844);
    await loadRoute(window, '/guide/stack');
    const mobile = await window.webContents.executeJavaScript(`({
      curriculumToggle: Boolean(document.querySelector('.curriculum-toggle')),
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      contentWidth: document.querySelector('.lesson-view')?.getBoundingClientRect().width
    })`);

    console.log(JSON.stringify({ guide, challenges, lab, mobile, consoleErrors: errors }));
    const valid = guide.route === '#/guide/registers'
      && guide.title === 'General Registers'
      && guide.lessons === 36
      && guide.stages === 6
      && guide.sections > 0
      && guide.diagrams > 0
      && guide.examples > 0
      && guide.quizQuestions >= 2
      && guide.numberedQuestions.length === guide.quizQuestions
      && guide.numberedQuestions.every((label, index) => label === `QUESTION ${index + 1} OF ${guide.quizQuestions}`)
      && guide.completionLocked
      && guide.mentalModel
      && guide.walkthrough
      && guide.liveVisualizer
      && guide.focusedVisualizer
      && guide.spacedParagraph
      && guide.scrollable
      && guide.noHorizontalOverflow
      && challenges.route === '#/challenges'
      && challenges.cards > 0
      && challenges.categories === 8
      && challenges.noHorizontalOverflow
      && lab.route === '#/lab'
      && lab.registers === 33
      && lab.controls === 4
      && lab.liveVisualizer
      && mobile.curriculumToggle
      && mobile.noHorizontalOverflow
      && mobile.contentWidth > 300
      && errors.length === 0;
    app.exit(valid ? 0 : 1);
  } catch (error) {
    console.error(error);
    console.error(JSON.stringify({ consoleErrors: errors, route: window.webContents.getURL() }));
    app.exit(1);
  }
});
