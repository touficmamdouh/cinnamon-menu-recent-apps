const fs = require('node:fs');
const path = require('node:path');
const { patchApplet } = require('./appletPatch');

function pathEntryExists(fsApi, targetPath) {
    try {
        fsApi.lstatSync(targetPath);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT')
            return false;
        throw error;
    }
}

function installRecentApps({ appletDir, helperSourcePath, version, now = new Date(), fsApi = fs }) {
    const appletPath = path.join(appletDir, 'applet.js');
    const helperPath = path.join(appletDir, 'recentApps.js');
    const appletStat = fsApi.lstatSync(appletPath);
    const helperSourceStat = fsApi.lstatSync(helperSourcePath);

    if (!appletStat.isFile() || appletStat.isSymbolicLink())
        throw new Error('Cinnamon applet must be a regular file.');
    if (!helperSourceStat.isFile() || helperSourceStat.isSymbolicLink())
        throw new Error('Package helper must be a regular file.');
    if (pathEntryExists(fsApi, helperPath))
        throw new Error('Recent Applications helper already exists; refusing to overwrite it.');

    const original = fsApi.readFileSync(appletPath, 'utf8');
    const patched = patchApplet(original, version);
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupBase = `applet.js.bak-recent-applications-${timestamp}`;
    let backupPath = path.join(appletDir, backupBase);
    let suffix = 1;
    while (pathEntryExists(fsApi, backupPath))
        backupPath = path.join(appletDir, `${backupBase}-${suffix++}`);

    const tempAppletPath = path.join(appletDir, `.applet.js.recent-applications-${process.pid}-${Math.random().toString(16).slice(2)}`);
    const tempHelperPath = path.join(appletDir, `.recentApps.js.recent-applications-${process.pid}-${Math.random().toString(16).slice(2)}`);
    let backupCreated = false;
    let helperInstalled = false;

    try {
        fsApi.copyFileSync(appletPath, backupPath, fs.constants.COPYFILE_EXCL);
        backupCreated = true;
        fsApi.chmodSync(backupPath, appletStat.mode & 0o7777);

        fsApi.copyFileSync(helperSourcePath, tempHelperPath, fs.constants.COPYFILE_EXCL);
        fsApi.chmodSync(tempHelperPath, helperSourceStat.mode & 0o7777);
        fsApi.renameSync(tempHelperPath, helperPath);
        helperInstalled = true;

        fsApi.writeFileSync(tempAppletPath, patched, {
            encoding: 'utf8',
            flag: 'wx',
            mode: appletStat.mode & 0o7777
        });
        fsApi.chmodSync(tempAppletPath, appletStat.mode & 0o7777);
        fsApi.renameSync(tempAppletPath, appletPath);
    } catch (error) {
        for (const tempPath of [tempAppletPath, tempHelperPath]) {
            try { fsApi.unlinkSync(tempPath); } catch {}
        }
        if (helperInstalled) {
            try { fsApi.unlinkSync(helperPath); } catch {}
        }
        if (backupCreated) {
            try { fsApi.unlinkSync(backupPath); } catch {}
        }
        throw error;
    }

    return backupPath;
}

module.exports = { installRecentApps };
