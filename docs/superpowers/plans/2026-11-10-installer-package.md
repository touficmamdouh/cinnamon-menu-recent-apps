# Recent Applications Installer Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a standalone installer package that safely adds and removes the Zeitgeist-backed Recent Applications section in Cinnamon Main Menu.

**Architecture:** Separate pure applet transformation and backup/restore operations from command-line privilege wrappers. The package does not whitelist Cinnamon version numbers; it validates the target source anchors before changing it, stores a timestamped original applet backup beside the system applet, installs the helper alongside it, and provides a matching restoration command.

**Tech Stack:** Node.js (built-in `node:test` and filesystem APIs), shell entry points, Cinnamon GJS applet, Zeitgeist D-Bus.

**Spec:** `docs/superpowers/specs/2026-11-10-recent-applications-installer-design.md`

## Global Constraints

- Do not reject by Cinnamon version number; require all expected source anchors before any write.
- Preserve original applet mode and create a timestamped adjacent backup before changing system files.
- Refuse missing/duplicate patch anchors, an already-patched applet, and unsafe restore targets without partial changes.
- Request system authorization through `pkexec`; never embed a password or require the user to type one into a script.
- Restore only from the selected verified backup and remove only this package's helper.

## Review Focus

- Incompatible applet source structure: installer makes no changes (test in Task 1 and Task 2).
- Incomplete or modified applet source: installer makes no changes (test in Task 1 and Task 2).
- Existing feature/helper or backup-name collision: installer refuses without overwriting (test in Task 2).
- Missing/corrupt backup or helper owned by another package: uninstaller refuses to remove files (test in Task 2).
- Failure during installation between applet and helper writes: original applet is restored and no partial install remains (test in Task 2).

---

### Task 1: Extract and test the patch transformation

**Files:**
- Create: `src/appletPatch.js`
- Create: `test/appletPatch.test.js`
- Create: `files/recentApps.js`
- Create: `package.json`

**Interfaces:**
- Produce: `patchApplet(source) -> string`; it returns patched applet source or throws before writes if anchors are incomplete, duplicated, or already patched.
- Consume: the verified Cinnamon Main Menu applet edits and Zeitgeist helper from the development workspace.

- [ ] Write tests asserting exact insertion of the import, refresh flag, menu refresh, Recent Applications category, and category-preservation changes for a menu-source fixture, regardless of a version number.
- [ ] Write tests that missing/duplicate anchors and already-patched input throw without mutating source.
- [ ] Run `node --test test/appletPatch.test.js`; confirm the expected failures before implementing `patchApplet`.
- [ ] Implement `patchApplet` with exact single-match replacement guards and copy the tested `recentApps.js` helper into `files/`.
- [ ] Run `node --test test/appletPatch.test.js`; expect all tests to pass.

### Task 2: Add safe install and restore commands

**Files:**
- Create: `src/systemInstall.js`
- Create: `src/systemUninstall.js`
- Create: `bin/install.js`
- Create: `bin/uninstall.js`
- Create: `test/systemInstall.test.js`
- Create: `test/systemUninstall.test.js`
- Modify: `package.json`

**Interfaces:**
- Consume: `patchApplet(source) -> string` from Task 1.
- Produce: filesystem operations accepting an injectable applet directory and helper source for temporary-directory tests; shell entry points invoke the operations through `pkexec`.

- [ ] Write temporary-directory tests for backup creation and mode preservation, refusal on already-installed/mismatched files, rollback on simulated write failure, and safe uninstall restoration.
- [ ] Run `node --test test/systemInstall.test.js test/systemUninstall.test.js`; confirm the named cases fail before implementation.
- [ ] Implement transactional install: validate first, create a unique backup, write a same-directory temporary applet, atomically replace it, install the helper without overwriting, and roll back on any failure.
- [ ] Implement uninstall: require a readable backup and the package helper marker, restore the selected original applet atomically, then remove only the helper installed by this package.
- [ ] Add `install` and `uninstall` entry points that request authorization with `pkexec` and do not embed credentials.
- [ ] Run the focused tests; expect all cases to pass.

### Task 3: Document, validate, and publish the package

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consume: the install/uninstall commands from Task 2.
- Produce: a standalone, documented repository with an origin at `git@github.com:touficmamdouh/cinnamon-menu-recent-apps.git`.

- [ ] Document supported version, Zeitgeist requirement, installation, verification, uninstall, backup location, and recovery.
- [ ] Run the complete `npm test` and JavaScript syntax checks; expect all tests and checks to pass.
- [ ] Review status/diff and ensure the repository contains only the package (not the full Cinnamon source tree or system backups).
- [ ] Initialize a feature branch, commit only reviewed package files, set the user's GitHub SSH URL as `origin`, and push the feature branch to the supplied repository.
- [ ] Verify the pushed branch with `git ls-remote` and report its URL.
