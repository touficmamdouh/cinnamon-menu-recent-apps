const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { patchApplet } = require('../src/appletPatch');
const sourceFixture = fs.readFileSync(path.join(__dirname, 'fixtures/applet.js.txt'), 'utf8');

test('patches every expected Cinnamon 6.6.9 applet anchor exactly once', () => {
    const patched = patchApplet(sourceFixture, '6.6.9');

    assert.match(patched, /require\('\.\/recentApps'\)/);
    assert.match(patched, /RECENT_APPS: 0b1000000/);
    assert.match(patched, /REFRESH_ALL_MASK = 0b1111111/);
    assert.match(patched, /this\._refreshRecentApplications\(\)/);
    assert.match(patched, /_refreshRecentApplications\(\)/);
    assert.match(patched, /_showRecentApplications\(applications\)/);
    assert.match(patched, /\['recent', 'recent-applications', 'favorite'\]/);
});

test('rejects unsupported Cinnamon versions without mutating the source', () => {
    const source = sourceFixture;

    assert.throws(() => patchApplet(source, '6.8.0'), /Unsupported Cinnamon version/);
    assert.equal(source, sourceFixture);
});

test('rejects missing or duplicate patch anchors', () => {
    assert.throws(() => patchApplet(sourceFixture.replace('this.recentButton = null;', ''), '6.6.9'), /anchor/);
    assert.throws(() => patchApplet(sourceFixture + "\nconst AppUtils = require('./appUtils');", '6.6.9'), /exactly once/);
});

test('rejects already-patched input', () => {
    assert.throws(() => patchApplet(sourceFixture + "\nconst RecentApps = require('./recentApps');", '6.6.9'), /already/);
});
