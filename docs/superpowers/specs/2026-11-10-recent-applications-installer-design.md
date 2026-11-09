# Recent Applications Installer — Design

- **Intent:** Publish an installable GitHub package that adds the ten most recently launched applications to Cinnamon Main Menu using Zeitgeist.
- **User outcome:** A user can install the enhancement on a compatible Cinnamon system and restore the original menu easily.
- **Approaches:** (1) ship a patch-only source package (requires manual patching); (2) ship an installer/uninstaller for the existing Main Menu (selected: simpler to use while keeping Cinnamon's built-in menu); (3) fork and ship all of Cinnamon (rejected: oversized and hard to maintain).
- **Install behavior:** Detect Cinnamon version and supported applet source; fail without changes if the version or patch anchors are unsupported or already modified. Request admin authorization through a graphical system prompt, preserve original permissions, create a timestamped adjacent backup, add the Zeitgeist helper, and then apply the narrow applet change.
- **Restore behavior:** Provide an uninstaller that verifies the backup and installed helper, restores the original applet from the selected backup, and removes only the helper installed by this package. Never remove user data or an unrelated backup.
- **Compatibility and testing:** Initially target Cinnamon 6.6.9, which is the installed version and the version verified in this session. Include non-privileged dry-run checks and automated tests for patch application, rejection of unsupported/already-patched files, and restore behavior. Document requirements, install, uninstall, and recovery.
- **Publication:** Create a standalone repository containing only package code, tests, and documentation; set its origin to `git@github.com:touficmamdouh/cinnamon-menu-recent-apps.git` and publish the branch after local verification.
