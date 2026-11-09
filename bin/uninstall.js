#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { findLatestBackup, uninstallRecentApps } = require('../src/systemUninstall');

const appletDir = '/usr/share/cinnamon/applets/menu@cinnamon.org';
const helperSourcePath = path.join(__dirname, '..', 'files', 'recentApps.js');

function cinnamonVersion() {
    const result = spawnSync('cinnamon', ['--version'], { encoding: 'utf8' });
    if (result.status !== 0)
        throw new Error(result.stderr || 'Could not determine Cinnamon version.');
    const match = result.stdout.match(/\bCinnamon\s+(\d+\.\d+\.\d+)\b/);
    if (!match)
        throw new Error(`Unrecognized Cinnamon version output: ${result.stdout.trim()}`);
    return match[1];
}

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
        process.stdout.write('Usage: node bin/uninstall.js\n\nRestores the most recent verified Cinnamon applet backup.\n');
        process.exit(0);
    }

    const version = cinnamonVersion();
    runAsRoot();
    const backupPath = findLatestBackup(appletDir);
    if (!backupPath)
        throw new Error('No Recent Applications backup was found.');
    uninstallRecentApps({ appletDir, backupPath, helperSourcePath, version });
    process.stdout.write(`Recent Applications removed. The original backup was kept at: ${backupPath}\n`);
} catch (error) {
    process.stderr.write(`Uninstallation failed: ${error.message}\n`);
    process.exitCode = 1;
}
