const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const SERVICE_PROBE = [
    'introspect',
    '--session',
    '--dest', 'org.gnome.zeitgeist.Engine',
    '--object-path', '/org/gnome/zeitgeist/log/activity'
];

function run(commandRunner, command, args) {
    const result = commandRunner(command, args, { encoding: 'utf8' });
    if (result.error)
        throw result.error;
    return result;
}

function isDebianFamily(osRelease) {
    const values = Object.fromEntries(osRelease.split(/\r?\n/)
        .map(line => line.match(/^([A-Z_]+)=(.*)$/))
        .filter(Boolean)
        .map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, '').toLowerCase()]));
    const family = `${values.ID || ''} ${values.ID_LIKE || ''}`.split(/\s+/);
    return family.some(id => ['debian', 'ubuntu', 'linuxmint'].includes(id));
}

function ensureZeitgeist({
    commandRunner = spawnSync,
    osReleasePath = '/etc/os-release',
    fsApi = fs,
    currentUid = typeof process.getuid === 'function' ? process.getuid() : 1000
} = {}) {
    const probe = () => run(commandRunner, 'gdbus', SERVICE_PROBE);
    if (probe().status === 0)
        return;

    const osRelease = fsApi.readFileSync(osReleasePath, 'utf8');
    if (!isDebianFamily(osRelease))
        throw new Error('Zeitgeist is unavailable. Automatic installation currently supports Debian-family systems only.');

    const packageStatus = run(commandRunner, 'dpkg-query', ['-W', '-f=${db:Status-Status}', 'zeitgeist']);
    const installed = packageStatus.status === 0 && packageStatus.stdout.trim() === 'installed';

    if (!installed) {
        const command = currentUid === 0 ? 'apt-get' : 'pkexec';
        const args = currentUid === 0
            ? ['install', '-y', 'zeitgeist']
            : ['apt-get', 'install', '-y', 'zeitgeist'];
        const installResult = run(commandRunner, command, args);
        if (installResult.status !== 0) {
            const details = installResult.stderr?.trim();
            throw new Error(`Could not install the Zeitgeist package.${details ? ` ${details}` : ''}`);
        }
    }

    const startResult = run(commandRunner, 'systemctl', ['--user', 'start', 'zeitgeist.service']);
    const verification = probe();
    if (verification.status !== 0) {
        const details = verification.stderr?.trim() || startResult.stderr?.trim();
        throw new Error(`Zeitgeist D-Bus service did not become available after startup.${details ? ` ${details}` : ''}`);
    }
}

module.exports = { ensureZeitgeist };
