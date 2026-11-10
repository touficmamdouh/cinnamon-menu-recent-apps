#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { installRecentApps } = require('../src/systemInstall');
const { patchApplet } = require('../src/appletPatch');
const { ensureZeitgeist } = require('../src/zeitgeistSetup');
const { isPrivilegedSystemRun } = require('../src/installMode');

const appletDir = '/usr/share/cinnamon/applets/menu@cinnamon.org';
const helperSourcePath = path.join(__dirname, '..', 'files', 'recentApps.js');
const appletPath = path.join(appletDir, 'applet.js');

function runAsRoot() {
    if (typeof process.getuid === 'function' && process.getuid() === 0)
        return true;
    const result = spawnSync('pkexec', [process.execPath, __filename, '--system'], { stdio: 'inherit' });
    if (result.error)
        throw result.error;
    process.exit(result.status ?? 1);
}

try {
    if (process.argv.includes('--help')) {
        process.stdout.write('Usage: node bin/install.js [--check]\n\nAdds Recent Applications to Cinnamon Main Menu.\n');
        process.exit(0);
    }

    const systemRun = isPrivilegedSystemRun(process.argv, process.getuid?.());
    if (process.argv.includes('--check')) {
        const fs = require('node:fs');
        patchApplet(fs.readFileSync(appletPath, 'utf8'));
        process.stdout.write('Cinnamon menu structure is compatible; no files changed.\n');
        process.exit(0);
    }

    if (!systemRun) {
        if (typeof process.getuid === 'function' && process.getuid() === 0)
            throw new Error('Run the installer as your desktop user, without sudo. It will request authorization when needed.');
        const fs = require('node:fs');
        patchApplet(fs.readFileSync(appletPath, 'utf8'));
        ensureZeitgeist();
    }

    runAsRoot();
    const backupPath = installRecentApps({ appletDir, helperSourcePath });
    process.stdout.write(`Recent Applications installed. Original applet backup: ${backupPath}\n`);
} catch (error) {
    process.stderr.write(`Installation failed: ${error.message}\n`);
    process.exitCode = 1;
}
