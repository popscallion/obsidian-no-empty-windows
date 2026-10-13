import {
  App,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
} from "obsidian";

interface MyPluginSettings {
  unpin: boolean;
  allowEmpty: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  unpin: true,
  allowEmpty: true,
};

class SettingTab extends PluginSettingTab {
  plugin: NoEmptyWindows;
  constructor(app: App, plugin: NoEmptyWindows) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("Unpin tabs")
      .setDesc("Enable to unpin pinned tabs instead of closing them directly.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.unpin).onChange(async (value) => {
          this.plugin.settings.unpin = value;
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName("Allow empty tabs")
      .setDesc(
        "Disable to close the window immediately when the last tab is closed, instead of spawning an empty tab."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.allowEmpty)
          .onChange(async (value) => {
            this.plugin.settings.allowEmpty = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
export default class NoEmptyWindows extends Plugin {
  settings: MyPluginSettings;
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    this.addCommand({
      id: "close-tab-or-empty-window",
      name: "Close current tab or empty window",
      callback: () => {
        const workspace = this.app.workspace;
        const leaves: WorkspaceLeaf[] = [];
        workspace.iterateAllLeaves((leaf) => {
          leaf.view.navigation && leaves.push(leaf);
        });
        const activeLeaf = workspace.getMostRecentLeaf();
        let activeGroup = activeLeaf!.parent;
        switch (true) {
          case this.settings.unpin && activeLeaf?.getViewState().pinned:
            activeLeaf!.setPinned(false);
            break;
          case leaves.length === 1 &&
            activeLeaf!.view.getViewType() === "empty":
            this.closeOrHide(activeLeaf!.getContainer().win);
            break;
          case leaves.length === 1 &&
            (!this.settings.allowEmpty ||
              (this.settings.allowEmpty &&
                activeLeaf!.view.getViewType() === "empty")):
            this.closeOrHide(activeLeaf!.getContainer().win);
            break;
          case leaves.length > 1 && activeGroup.children.length === 1:
            const relatives = activeGroup.parent.children;
            const activeGroups =
              relatives.length > 1
                ? relatives
                    .filter((child: WorkspaceLeaf) => child != activeGroup)
                    .sort(
                      (a: any, b: any) => a.children.length - b.children.length
                    )
                : [...new Set(leaves.map((leaf: any) => leaf.parent))]
                    .filter((group) => group != activeGroup)
                    .sort((a, b) => a.children.length - b.children.length);
            activeGroup = activeGroups[0];
            const activeLeaves = activeGroup.children;
            const nextActiveLeaf = activeLeaves[activeGroup.currentTab];
            workspace.setActiveLeaf(nextActiveLeaf, { focus: true });
          default:
            activeLeaf!.detach();
        }
      },
    });
  }
  // Closing the main window quits the vault (cold start on relaunch), so on
  // macOS hide the app instead (same as Cmd+H). Popout windows close normally.
  // Falls back to win.close() if Electron's remote module is unavailable.
  closeOrHide(win: Window) {
    const app = Platform.isMacOS && win === window ? this.getElectronApp() : null;
    if (app) {
      app.hide();
    } else {
      win.close();
    }
  }
  // Newer Obsidian builds ship @electron/remote; older ones expose it as
  // electron.remote.
  getElectronApp(): { hide(): void } | null {
    const req = (window as unknown as { require?: (id: string) => any })
      .require;
    for (const load of [
      () => req?.("@electron/remote"),
      () => req?.("electron")?.remote,
    ]) {
      try {
        const app = load()?.app;
        if (typeof app?.hide === "function") return app;
      } catch (e) {
        // module not available, try the next source
      }
    }
    return null;
  }
  onunload() {}
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
