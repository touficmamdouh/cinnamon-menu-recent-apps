const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { installRecentApps } = require('../src/systemInstall');
const { patchApplet } = require('../src/appletPatch');

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/applet.js.txt'), 'utf8');
const helperSource = fs.readFileSync(path.join(__dirname, '../files/recentApps.js'), 'utf8');

function setup() {
    const appletDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recent-apps-install-'));
    const appletPath = path.join(appletDir, 'applet.js');
    const helperFile = path.join(appletDir, 'helper-source.js');
    fs.writeFileSync(appletPath, fixture, { mode: 0o751 });
    fs.writeFileSync(helperFile, helperSource);
    fs.chmodSync(appletPath, 0o751);
    return { appletDir, appletPath, helperFile };
}

test('backs up the original applet, preserves its mode, and installs the helper', () => {
    const { appletDir, appletPath, helperFile } = setup();

    const backupPath = installRecentApps({
        appletDir,
        helperSourcePath: helperFile,
        version: '6.6.9',
        now: new Date('2026-11-10T12:00:00.000Z')
    });

    assert.equal(fs.readFileSync(backupPath, 'utf8'), fixture);
    assert.equal(fs.statSync(appletPath).mode & 0o777, 0o751);
    assert.equal(fs.readFileSync(path.join(appletDir, 'recentApps.js'), 'utf8'), helperSource);
    assert.equal(fs.readFileSync(appletPath, 'utf8'), patchApplet(fixture, '6.6.9'));
});

test('refuses unsupported versions and already-patched applets without writing', () => {
    const { appletDir, appletPath, helperFile } = setup();
    assert.throws(() => installRecentApps({ appletDir, helperSourcePath: helperFile, version: '6.8.0' }), /Unsupported Cinnamon version/);
    assert.equal(fs.readFileSync(appletPath, 'utf8'), fixture);

    fs.writeFileSync(path.join(appletDir, 'recentApps.js'), 'unrelated helper');
    assert.throws(() => installRecentApps({ appletDir, helperSourcePath: helperFile, version: '6.6.9' }), /already exists/);
    fs.unlinkSync(path.join(appletDir, 'recentApps.js'));

    fs.writeFileSync(appletPath, patchApplet(fixture, '6.6.9'));
    assert.throws(() => installRecentApps({ appletDir, helperSourcePath: helperFile, version: '6.6.9' }), /already installed/);
    assert.deepEqual(fs.readdirSync(appletDir).sort(), ['applet.js', 'helper-source.js']);
});

test('refuses to replace a dangling helper symlink', () => {
    const { appletDir, appletPath, helperFile } = setup();
    const helperPath = path.join(appletDir, 'recentApps.js');
    fs.symlinkSync(path.join(appletDir, 'does-not-exist'), helperPath);

    assert.throws(() => installRecentApps({ appletDir, helperSourcePath: helperFile, version: '6.6.9' }), /already exists/);
    assert.equal(fs.readlinkSync(helperPath), path.join(appletDir, 'does-not-exist'));
    assert.equal(fs.readFileSync(appletPath, 'utf8'), fixture);
});

test('rolls back backup and helper if helper installation fails', () => {
    const { appletDir, appletPath, helperFile } = setup();
    const helperPath = path.join(appletDir, 'recentApps.js');
    const fsApi = new Proxy(fs, {
        get(target, property) {
            if (property === 'renameSync') {
                return (source, destination) => {
                    if (destination === helperPath)
                        throw new Error('simulated helper install failure');
                    return target.renameSync(source, destination);
                };
            }
            const value = Reflect.get(target, property);
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });

    assert.throws(() => installRecentApps({
        appletDir,
        helperSourcePath: helperFile,
        version: '6.6.9',
        fsApi
    }), /simulated helper install failure/);
    assert.equal(fs.readFileSync(appletPath, 'utf8'), fixture);
    assert.deepEqual(fs.readdirSync(appletDir).sort(), ['applet.js', 'helper-source.js']);
});
