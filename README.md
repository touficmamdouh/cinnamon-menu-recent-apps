# Cinnamon Menu — Recent Applications

Adds a **Recent Applications** category to Cinnamon's built-in Main Menu. It reads launch/activity events from Zeitgeist, displays up to ten distinct installed applications, and keeps the ordering across sessions using Zeitgeist's existing history.

## Compatibility

- Cinnamon **6.6.9** only. Other versions are intentionally rejected until their applet source has been tested.
- Zeitgeist must be installed and its session service running for recent applications to appear.
- Node.js is used only by the installer and tests; no Node package dependencies are required.
- Linux desktop with `pkexec` available for system file access.

## Install

One-command install from the published branch:

```sh
git clone --depth 1 --branch feature/recent-applications-installer https://github.com/touficmamdouh/cinnamon-menu-recent-apps.git "$HOME/.local/share/cinnamon-menu-recent-apps" && npm --prefix "$HOME/.local/share/cinnamon-menu-recent-apps" run install-menu
```

The clone is kept under `~/.local/share/cinnamon-menu-recent-apps` so the uninstaller can use the same package files later. If you prefer, clone the repository manually and run the non-modifying compatibility check first:

```sh
npm run check
```

Install the enhancement:

```sh
npm run install-menu
```

The installer asks the desktop authorization agent for administrator permission. It validates Cinnamon's version and the exact menu source anchors before changing anything. It creates a timestamped backup beside the applet, then installs the Zeitgeist helper and updates the menu. If validation fails or files were customized, the installer stops without replacing them.

Open the Main Menu and choose **Recent Applications**. To make Cinnamon reload the updated menu without logging out, restart the menu applet from Cinnamon's applet settings or log out and back in.

## Uninstall

Run:

```sh
npm --prefix "$HOME/.local/share/cinnamon-menu-recent-apps" run uninstall-menu
```

The uninstaller restores the newest verified backup and removes only the helper file installed by this package. It keeps the backup after restoration. If the menu or helper changed after installation, it refuses to overwrite those changes.

## Backups and recovery

Backups are stored next to the built-in applet as:

```text
/usr/share/cinnamon/applets/menu@cinnamon.org/applet.js.bak-recent-applications-<timestamp>
```

To recover manually, copy the desired backup over `applet.js` as an administrator, then remove `/usr/share/cinnamon/applets/menu@cinnamon.org/recentApps.js` only if the restored applet no longer imports it. Keep the backup until the menu has been checked.

## Development and tests

```sh
npm test
```

Tests use temporary directories and do not alter the installed Cinnamon menu. They cover the patch transformation, compatibility checks, backup and permission preservation, install rollback, restore behavior, and protection of local changes.

## License

GPL-2.0-only. This project modifies Cinnamon's built-in Main Menu, which is distributed under the GNU General Public License version 2; see [`LICENSE`](LICENSE).
