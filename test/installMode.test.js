const test = require('node:test');
const assert = require('node:assert/strict');
const { isPrivilegedSystemRun } = require('../src/installMode');

test('does not treat a user-supplied system flag as an authorized elevated run', () => {
    assert.equal(isPrivilegedSystemRun(['--system'], 1000), false);
});

test('recognizes the pkexec child only when running as root', () => {
    assert.equal(isPrivilegedSystemRun(['--system'], 0), true);
});
