const SUPPORTED_VERSION = '6.6.9';

function replaceOnce(source, before, after, description) {
    const first = source.indexOf(before);
    if (first === -1 || source.indexOf(before, first + before.length) !== -1)
        throw new Error(`Cinnamon applet ${description} anchor did not match exactly once.`);
    return source.slice(0, first) + after + source.slice(first + before.length);
}

function patchApplet(source, version) {
    if (version !== SUPPORTED_VERSION)
        throw new Error(`Unsupported Cinnamon version ${version}; supported version is ${SUPPORTED_VERSION}.`);
    if (source.includes("require('./recentApps')"))
        throw new Error('Recent Applications is already installed.');

    let patched = source;
    patched = replaceOnce(patched,
        "const AppUtils = require('./appUtils');",
        "const AppUtils = require('./appUtils');\nconst RecentApps = require('./recentApps');",
        'module import');
    patched = replaceOnce(patched,
        '    SYSTEM:   0b100000\n});\nconst REFRESH_ALL_MASK = 0b111111;',
        '    SYSTEM:   0b100000,\n    RECENT_APPS: 0b1000000\n});\nconst REFRESH_ALL_MASK = 0b1111111;',
        'refresh flags');
    patched = replaceOnce(patched,
        '        this.recentButton = null;\n        this._recentButtons = [];',
        '        this.recentButton = null;\n        this._recentButtons = [];\n        this.recentApplicationsButton = null;\n        this._recentApplicationsButtons = [];\n        this._recentApplicationsRequestId = 0;',
        'recent application state');
    patched = replaceOnce(patched,
        '        if ((m & RefreshFlags.RECENT) === RefreshFlags.RECENT)\n            this._refreshRecent();',
        '        if ((m & RefreshFlags.RECENT) === RefreshFlags.RECENT)\n            this._refreshRecent();\n        if ((m & RefreshFlags.RECENT_APPS) === RefreshFlags.RECENT_APPS)\n            this._refreshRecentApplications();',
        'refresh dispatch');
    patched = replaceOnce(patched,
        '        if (this.recentButton) {\n            this.categoriesBox.set_child_at_index(this.recentButton.actor, -1);\n        }',
        '        if (this.recentButton) {\n            this.categoriesBox.set_child_at_index(this.recentButton.actor, -1);\n        }\n\n        if (this.recentApplicationsButton) {\n            this.categoriesBox.set_child_at_index(this.recentApplicationsButton.actor, -1);\n        }',
        'category ordering');
    patched = replaceOnce(patched,
        '    _onOpenStateChanged(menu, open) {\n        if (open) {',
        '    _onOpenStateChanged(menu, open) {\n        if (open) {\n            this.queueRefresh(RefreshFlags.RECENT_APPS);',
        'menu-open refresh');
    patched = replaceOnce(patched,
        '    _refreshFavDocs() {',
        `    _refreshRecentApplications() {
        this._recentApplicationsButtons.forEach(button => button.destroy());
        this._recentApplicationsButtons = [];

        const index = this._categoryButtons.findIndex(button => button.categoryId === 'recent-applications');
        if (index !== -1) {
            this._categoryButtons[index].destroy();
            this._categoryButtons.splice(index, 1);
            this.recentApplicationsButton = null;
        }

        const requestId = ++this._recentApplicationsRequestId;
        try {
            const proxy = Gio.DBusProxy.new_for_bus_sync(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.gnome.zeitgeist.Engine',
                '/org/gnome/zeitgeist/log/activity',
                'org.gnome.zeitgeist.Log',
                null
            );
            const parameters = new GLib.Variant('((xx)a(asaasay)uuu)', [[0, 0], [], 0, 1000, 0]);
            proxy.call('FindEvents', parameters, Gio.DBusCallFlags.NONE, 10000, null, (source, result) => {
                if (requestId !== this._recentApplicationsRequestId)
                    return;

                try {
                    const events = source.call_finish(result).deep_unpack()[0];
                    const desktopIds = RecentApps.getRecentApplicationIds(
                        events,
                        id => Boolean(appsys.lookup_app(id))
                    );
                    const applications = desktopIds
                        .map(id => appsys.lookup_app(id))
                        .filter(Boolean);

                    this._showRecentApplications(applications);
                } catch (e) {
                    global.logError('Unable to load recently used applications: ' + e);
                    this._showRecentApplications([]);
                }
            });
        } catch (e) {
            global.logError('Unable to connect to Zeitgeist: ' + e);
            this._showRecentApplications([]);
        }
    }

    _showRecentApplications(applications) {
        this._recentApplicationsButtons.forEach(button => button.destroy());
        this._recentApplicationsButtons = [];

        if (!this.recentApplicationsButton) {
            this.recentApplicationsButton = new CategoryButton(
                this,
                'recent-applications',
                _('Recent Applications'),
                'applications-other'
            );
            this._categoryButtons.push(this.recentApplicationsButton);
            this.categoriesBox.add_actor(this.recentApplicationsButton.actor);
        }

        if (applications.length === 0) {
            const button = new SimpleMenuItem(this, {
                name: _('No recently used applications'),
                type: 'recent-applications',
                styleClass: 'appmenu-application-button',
                reactive: false,
                activatable: false
            });
            button.addLabel(button.name, 'appmenu-application-button-label');
            this._recentApplicationsButtons.push(button);
            this.applicationsBox.add_actor(button.actor);
            button.actor.visible = this.menu.isOpen && this.lastSelectedCategory === 'recent-applications';
            return;
        }

        for (const app of applications) {
            const button = new ApplicationButton(this, app);
            button.type = 'recent-applications';
            this._recentApplicationsButtons.push(button);
            this.applicationsBox.add_actor(button.actor);
            button.actor.visible = this.menu.isOpen && this.lastSelectedCategory === 'recent-applications';
        }
    }

    _refreshFavDocs() {`,
        'recent application methods');
    patched = replaceOnce(patched,
        "            if (['recent', 'favorite'].includes(b.categoryId))",
        "            if (['recent', 'recent-applications', 'favorite'].includes(b.categoryId))",
        'preserve recent applications category');

    return patched;
}

module.exports = { patchApplet, SUPPORTED_VERSION };
