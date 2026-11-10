const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ensureZeitgeist } = require('../src/zeitgeistSetup');

function setup(osRelease = 'ID=linuxmint\nID_LIKE="ubuntu debian"\n') {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgeist-setup-'));
    const osReleasePath = path.join(directory, 'os-release');
    fs.writeFileSync(osReleasePath, osRelease);
    const calls = [];
    const responses = [];
    const commandRunner = (command, args) => {
        calls.push([command, args]);
        const response = responses.shift();
        if (!response)
            throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        return response;
    };
    return { osReleasePath, calls, responses, commandRunner };
}

const success = (stdout = '') => ({ status: 0, stdout, stderr: '' });
const failure = (stderr = 'not available') => ({ status: 1, stdout: '', stderr });

test('does nothing when the Zeitgeist D-Bus service already responds', () => {
    const context = setup();
    context.responses.push(success());

    ensureZeitgeist(context);

    assert.deepEqual(context.calls.map(([command]) => command), ['gdbus']);
});

test('installs Zeitgeist on Mint when missing, starts the user unit, and verifies D-Bus', () => {
    const context = setup();
    context.responses.push(failure(), failure(), success(), success(), success());

    ensureZeitgeist({ ...context, currentUid: 1000 });

    assert.deepEqual(context.calls.map(([command]) => command), [
        'gdbus', 'dpkg-query', 'pkexec', 'systemctl', 'gdbus'
    ]);
    assert.deepEqual(context.calls[2], ['pkexec', ['apt-get', 'install', '-y', 'zeitgeist']]);
    assert.deepEqual(context.calls[3], ['systemctl', ['--user', 'start', 'zeitgeist.service']]);
});

test('starts an installed but inactive user service without reinstalling it', () => {
    const context = setup();
    context.responses.push(failure(), success('installed\n'), success(), success());

    ensureZeitgeist({ ...context, currentUid: 1000 });

    assert.deepEqual(context.calls.map(([command]) => command), ['gdbus', 'dpkg-query', 'systemctl', 'gdbus']);
});

test('refuses unsupported distributions before invoking a package manager', () => {
    const context = setup('ID=fedora\nID_LIKE="rhel fedora"\n');
    context.responses.push(failure());

    assert.throws(() => ensureZeitgeist(context), /Debian-family/);
    assert.deepEqual(context.calls.map(([command]) => command), ['gdbus']);
});

test('does not proceed when package installation fails', () => {
    const context = setup();
    context.responses.push(failure(), failure(), failure('apt failed'));

    assert.throws(() => ensureZeitgeist({ ...context, currentUid: 1000 }), /apt failed/);
    assert.deepEqual(context.calls.map(([command]) => command), ['gdbus', 'dpkg-query', 'pkexec']);
});

test('reports service startup failure when D-Bus remains unavailable', () => {
    const context = setup();
    context.responses.push(failure(), success('installed\n'), failure('unit failed'), failure('bus unavailable'));

    assert.throws(() => ensureZeitgeist({ ...context, currentUid: 1000 }), /Zeitgeist D-Bus service did not become available/);
    assert.deepEqual(context.calls.map(([command]) => command), ['gdbus', 'dpkg-query', 'systemctl', 'gdbus']);
});
