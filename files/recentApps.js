function desktopIdFromUri(uri) {
    const prefix = 'application://';
    return typeof uri === 'string' && uri.startsWith(prefix)
        ? uri.slice(prefix.length)
        : null;
}

function getRecentApplicationIds(events, isLaunchable, limit = 10) {
    const result = [];
    const seen = new Set();

    for (const event of events) {
        const [metadata, subjects] = event;
        const applicationSubject = subjects.find(subject =>
            desktopIdFromUri(subject[0]) && subject[2]?.endsWith('#SoftwareItem'));
        const candidateUri = applicationSubject ? applicationSubject[0] : metadata[4];
        const desktopId = desktopIdFromUri(candidateUri);

        if (!desktopId || seen.has(desktopId) || !isLaunchable(desktopId))
            continue;

        seen.add(desktopId);
        result.push(desktopId);
        if (result.length === limit)
            break;
    }

    return result;
}

module.exports = { getRecentApplicationIds };
