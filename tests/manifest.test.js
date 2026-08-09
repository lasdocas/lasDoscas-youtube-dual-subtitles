const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(
  path.join(projectRoot, 'manifest.json'),
  'utf8'
));

function assertProjectFileExists(relativePath, source) {
  assert.equal(path.isAbsolute(relativePath), false, `${source} must use a relative path`);
  assert.equal(relativePath.includes('..'), false, `${source} must stay within the extension root`);
  assert.equal(
    fs.existsSync(path.join(projectRoot, relativePath)),
    true,
    `${source} references missing file: ${relativePath}`
  );
}

test('manifest references existing scripts, styles, resources, and icons', () => {
  manifest.content_scripts.forEach((entry, entryIndex) => {
    (entry.js || []).forEach((file) =>
      assertProjectFileExists(file, `content_scripts[${entryIndex}].js`)
    );
    (entry.css || []).forEach((file) =>
      assertProjectFileExists(file, `content_scripts[${entryIndex}].css`)
    );
  });
  manifest.web_accessible_resources.forEach((entry, entryIndex) => {
    entry.resources.forEach((file) =>
      assertProjectFileExists(file, `web_accessible_resources[${entryIndex}]`)
    );
  });
  Object.values(manifest.icons).forEach((file) => assertProjectFileExists(file, 'icons'));
  Object.values(manifest.action.default_icon).forEach((file) =>
    assertProjectFileExists(file, 'action.default_icon')
  );
  assertProjectFileExists(manifest.action.default_popup, 'action.default_popup');
  assertProjectFileExists(manifest.background.service_worker, 'background.service_worker');
  assertProjectFileExists(
    `_locales/${manifest.default_locale}/messages.json`,
    'default_locale'
  );
});

test('manifest keeps page bridge and extension content in separate worlds', () => {
  const mainEntry = manifest.content_scripts.find((entry) => entry.world === 'MAIN');
  const isolatedEntry = manifest.content_scripts.find((entry) => entry.world === 'ISOLATED');

  assert.ok(mainEntry, 'MAIN world content script is required');
  assert.ok(isolatedEntry, 'ISOLATED world content script is required');
  assert.deepEqual(mainEntry.js, ['page-bridge.js']);
  assert.equal(mainEntry.run_at, 'document_start');
  assert.deepEqual(isolatedEntry.js, ['localization.js', 'content.js']);
  assert.equal(isolatedEntry.run_at, 'document_idle');
});
