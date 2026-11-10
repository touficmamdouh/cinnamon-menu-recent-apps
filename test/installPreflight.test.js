const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareInstallation } = require('../src/installPreflight');
const { patchApplet } = require('../src/appletPatch');

const source = fs.readFileSync(path.join(__dirname, 'fixtures/applet.js.txt'), 'utf8');

test('validates an unpatched menu before ensuring Zeitgeist', () => {
    const calls = [];

    const result = prepareInstallation({
        source,
        helperPath: '/tmp/not-installed/recentApps.js',
        ensureService: () => calls.push('zeitgeist')
    });

    assert.deepEqual(result, { alreadyInstalled: false });
    assert.deepEqual(calls, ['zeitgeist']);
});

test('ensures Zeitgeist again when the applet and helper are already installed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'recent-apps-preflight-'));
    const helperPath = path.join(directory, 'recentApps.js');
    fs.writeFileSync(helperPath, 'installed helper');
    const calls = [];

    const result = prepareInstallation({
        source: patchApplet(source),
        helperPath,
        ensureService: () => calls.push('zeitgeist')
    });

    assert.deepEqual(result, { alreadyInstalled: true });
    assert.deepEqual(calls, ['zeitgeist']);
});

test('refuses a partially installed applet before running dependency setup', () => {
    const calls = [];

    assert.throws(() => prepareInstallation({
        source: patchApplet(source),
        helperPath: '/tmp/missing/recentApps.js',
        ensureService: () => calls.push('zeitgeist')
    }), /helper is missing/);
    assert.deepEqual(calls, []);
});

test('does not run dependency setup when the menu source is incompatible', () => {
    const calls = [];

    assert.throws(() => prepareInstallation({
        source: source.replace('this.recentButton = null;', 'this.otherButton = null;'),
        helperPath: '/tmp/not-installed/recentApps.js',
        ensureService: () => calls.push('zeitgeist')
    }), /anchor/);
    assert.deepEqual(calls, []);
});
