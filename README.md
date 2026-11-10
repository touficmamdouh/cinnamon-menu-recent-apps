# Cinnamon Menu — Recent Applications

Adds a **Recent Applications** category to Cinnamon's built-in Main Menu. It reads launch/activity events from Zeitgeist, displays up to ten distinct installed applications, and keeps the ordering across sessions using Zeitgeist's existing history.

## Compatibility

- No Cinnamon version-number whitelist. The installer applies the patch when the installed Main Menu source contains the required anchors.
- On Debian-family systems, the installer installs `zeitgeist` if missing and starts the user's `zeitgeist.service` before modifying the menu.
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

The installer checks the Main Menu source structure and confirms Zeitgeist responds over the user's D-Bus session before changing the menu. If Zeitgeist is missing on Debian-family systems, it asks for authorization to install the `zeitgeist` package, then starts and verifies `zeitgeist.service`. It next requests authorization to update the Cinnamon applet and creates a timestamped backup beside it. If service setup or source validation fails, the menu files are left untouched. On other distributions, install and start Zeitgeist with that distribution's package manager before running the installer.

Zeitgeist history starts empty on a new installation. Open a few applications once; they will appear after Zeitgeist records those launches.

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

Tests use temporary directories and do not alter the installed Cinnamon menu or system services. They cover the patch transformation, Zeitgeist setup paths, backup and permission preservation, install rollback, restore behavior, and protection of local changes.

## License

GPL-2.0-only. This project modifies Cinnamon's built-in Main Menu, which is distributed under the GNU General Public License version 2; see [`LICENSE`](LICENSE).
