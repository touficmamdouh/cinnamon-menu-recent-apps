# Zeitgeist Service Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Before patching Cinnamon Main Menu on Linux Mint, make sure Zeitgeist is installed and its user-session service responds over D-Bus.

**Architecture:** Add a testable service-setup module called by the installer before system applet changes. It first probes the user D-Bus endpoint, installs the fixed `zeitgeist` package with `pkexec apt-get` only when missing on Debian-family systems, starts `zeitgeist.service` as the logged-in user, and verifies the endpoint again. Failure prevents applet writes.

**Tech Stack:** Node.js built-ins (`child_process`, `fs`), `gdbus`, `dpkg-query`, `apt-get`, `systemctl --user`, Zeitgeist D-Bus.

**Spec:** `docs/superpowers/specs/2026-11-10-zeitgeist-service-design.md`

## Global Constraints

- Do not reject by Cinnamon version number; require all expected applet source anchors before any write.
- If Zeitgeist is absent, only auto-install the fixed package `zeitgeist` on Debian-family systems using the system's package manager and `pkexec` when needed.
- Start `zeitgeist.service` in the user's session, never as root.
- Do not change Cinnamon applet files until the Zeitgeist D-Bus endpoint has responded successfully.
- Do not clear or rewrite activity history.

## Review Focus

- Zeitgeist already responds on D-Bus: skip package installation and service startup (Task 1 test).
- Package missing on Linux Mint: install `zeitgeist`, start the user unit, then verify D-Bus (Task 1 tests).
- Package already installed but service stopped: start the user unit without reinstalling (Task 1 test).
- Unsupported package manager or unavailable authorization: stop with a clear error before applet files change (Task 1 tests).
- Service still fails after startup: stop before applet files change and report the D-Bus failure (Task 1 test).

---

### Task 1: Add testable Zeitgeist readiness and installer integration

**Files:**
- Create: `src/zeitgeistSetup.js`
- Create: `test/zeitgeistSetup.test.js`
- Modify: `bin/install.js`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produce: `ensureZeitgeist({ commandRunner, osReleasePath, fsApi }) -> void`; it probes D-Bus, conditionally installs the package, starts the user service, verifies readiness, or throws before system menu changes.
- Consume: the existing installer flow; call `ensureZeitgeist()` before `runAsRoot()` and `installRecentApps()`.

- [ ] Write tests for already-active service, missing package/install path, installed-but-stopped service, unsupported distribution, failed service startup, and D-Bus verification failure using an injected command runner.
- [ ] Run `node --test test/zeitgeistSetup.test.js`; confirm the expected missing-module/API failures.
- [ ] Implement D-Bus probing, Debian-family detection from os-release, `dpkg-query` package detection, privileged `apt-get install -y zeitgeist` when absent, `systemctl --user start zeitgeist.service`, and final D-Bus verification.
- [ ] Call `ensureZeitgeist()` before any system applet write; keep Zeitgeist startup in the user's session.
- [ ] Document automatic package/service setup, first-run history behavior, and failure output.
- [ ] Run `npm test` and JavaScript syntax checks; expect all tests to pass.
- [ ] Review and publish the change on `feature/recent-applications-installer`.
