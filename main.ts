import {
  App,
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
            activeLeaf!.getContainer().win.close();
            break;
          case leaves.length === 1 &&
            (!this.settings.allowEmpty ||
              (this.settings.allowEmpty &&
                activeLeaf!.view.getViewType() === "empty")):
            activeLeaf!.getContainer().win.close();
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
  onunload() {}
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
