const fs = require('node:fs');
const path = require('node:path');
const { patchApplet } = require('./appletPatch');

const BACKUP_PREFIX = 'applet.js.bak-recent-applications-';

function findLatestBackup(appletDir, fsApi = fs) {
    const backups = fsApi.readdirSync(appletDir)
        .filter(name => name.startsWith(BACKUP_PREFIX))
        .sort()
        .reverse();
    return backups.length ? path.join(appletDir, backups[0]) : null;
}

function uninstallRecentApps({ appletDir, backupPath, helperSourcePath, version, fsApi = fs }) {
    const appletPath = path.join(appletDir, 'applet.js');
    const helperPath = path.join(appletDir, 'recentApps.js');
    const resolvedDir = path.resolve(appletDir);
    const resolvedBackup = path.resolve(backupPath || '');

    if (path.dirname(resolvedBackup) !== resolvedDir || !path.basename(resolvedBackup).startsWith(BACKUP_PREFIX))
        throw new Error('Selected backup is not a Recent Applications backup in the Cinnamon applet directory.');

    const appletStat = fsApi.lstatSync(appletPath);
    const backupStat = fsApi.lstatSync(resolvedBackup);
    const helperStat = fsApi.lstatSync(helperPath);
    const expectedHelperStat = fsApi.lstatSync(helperSourcePath);
    if (![appletStat, backupStat, helperStat, expectedHelperStat].every(stat => stat.isFile() && !stat.isSymbolicLink()))
        throw new Error('Applet, backup, and helper must be regular files.');

    const original = fsApi.readFileSync(resolvedBackup, 'utf8');
    const current = fsApi.readFileSync(appletPath, 'utf8');
    const helper = fsApi.readFileSync(helperPath);
    const expectedHelper = fsApi.readFileSync(helperSourcePath);

    if (!helper.equals(expectedHelper))
        throw new Error('Installed helper differs from this package; refusing to remove it.');
    if (patchApplet(original, version) !== current)
        throw new Error('Installed applet does not match the selected backup and package patch; refusing to overwrite local changes.');

    const tempAppletPath = path.join(appletDir, `.applet.js.restore-${process.pid}-${Math.random().toString(16).slice(2)}`);
    fsApi.writeFileSync(tempAppletPath, original, {
        encoding: 'utf8',
        flag: 'wx',
        mode: backupStat.mode & 0o7777
    });
    try {
        fsApi.chmodSync(tempAppletPath, backupStat.mode & 0o7777);
        fsApi.renameSync(tempAppletPath, appletPath);
        fsApi.unlinkSync(helperPath);
    } catch (error) {
        try { fsApi.unlinkSync(tempAppletPath); } catch {}
        throw error;
    }
}

module.exports = { findLatestBackup, uninstallRecentApps };
