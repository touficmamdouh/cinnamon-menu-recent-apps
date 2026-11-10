const fs = require('node:fs');
const { patchApplet } = require('./appletPatch');

function getRegularFile(fsApi, filePath) {
    try {
        const stat = fsApi.lstatSync(filePath);
        return stat.isFile() && !stat.isSymbolicLink();
    } catch (error) {
        if (error.code === 'ENOENT')
            return false;
        throw error;
    }
}

function prepareInstallation({ source, helperPath, ensureService, fsApi = fs }) {
    const alreadyPatched = source.includes("require('./recentApps')");
    const helperExists = getRegularFile(fsApi, helperPath);

    if (alreadyPatched && !helperExists)
        throw new Error('Recent Applications applet is patched but its helper is missing or invalid.');
    if (!alreadyPatched && helperExists)
        throw new Error('Recent Applications helper already exists without its applet patch.');

    if (!alreadyPatched)
        patchApplet(source);

    ensureService();
    return { alreadyInstalled: alreadyPatched };
}

module.exports = { prepareInstallation };
