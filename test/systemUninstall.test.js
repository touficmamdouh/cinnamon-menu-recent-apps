const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { installRecentApps } = require('../src/systemInstall');
const { uninstallRecentApps } = require('../src/systemUninstall');

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/applet.js.txt'), 'utf8');
const helperSource = fs.readFileSync(path.join(__dirname, '../files/recentApps.js'), 'utf8');

function installFixture() {
    const appletDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recent-apps-uninstall-'));
    const appletPath = path.join(appletDir, 'applet.js');
    const helperSourcePath = path.join(appletDir, 'helper-source.js');
    fs.writeFileSync(appletPath, fixture);
    fs.writeFileSync(helperSourcePath, helperSource);
    const backupPath = installRecentApps({ appletDir, helperSourcePath });
    return { appletDir, appletPath, backupPath, helperSourcePath };
}

test('restores the selected backup and removes only the package helper', () => {
    const { appletDir, appletPath, backupPath, helperSourcePath } = installFixture();

    uninstallRecentApps({ appletDir, backupPath, helperSourcePath });

    assert.equal(fs.readFileSync(appletPath, 'utf8'), fixture);
    assert.equal(fs.existsSync(path.join(appletDir, 'recentApps.js')), false);
    assert.equal(fs.existsSync(backupPath), true);
});

test('refuses restoration when the applet or helper was changed after installation', () => {
    const { appletDir, appletPath, backupPath, helperSourcePath } = installFixture();
    fs.appendFileSync(appletPath, '\n// local edit\n');
    assert.throws(() => uninstallRecentApps({ appletDir, backupPath, helperSourcePath }), /does not match/);
    assert.equal(fs.existsSync(path.join(appletDir, 'recentApps.js')), true);

    const next = installFixture();
    fs.appendFileSync(path.join(next.appletDir, 'recentApps.js'), '\n// local edit\n');
    assert.throws(() => uninstallRecentApps({ appletDir: next.appletDir, backupPath: next.backupPath, helperSourcePath: next.helperSourcePath }), /helper/);
});
