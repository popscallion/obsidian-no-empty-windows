import {
  App,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
} from "obsidian";

interface NoEmptyWindowsSettings {
  unpin: boolean;
  allowEmpty: boolean;
  closeButton: boolean;
  hideOnMac: boolean;
}

// Parts of the workspace tree and of Electron that the plugin reaches into
// and that are not in Obsidian's public typings.
interface TabGroup {
  children: WorkspaceLeaf[];
  currentTab: number;
  parent: { children: unknown[] };
}
interface ElectronRemote {
  app: { hide(): void };
  BrowserWindow: { getAllWindows(): { isVisible(): boolean }[] };
}

const DEFAULT_SETTINGS: NoEmptyWindowsSettings = {
  unpin: true,
  allowEmpty: true,
  closeButton: true,
  hideOnMac: false,
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
    new Setting(containerEl)
      .setName("Close button")
      .setDesc(
        "Enable to also close the window when the last tab is closed with its close button or a middle click."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.closeButton)
          .onChange(async (value) => {
            this.plugin.settings.closeButton = value;
            await this.plugin.saveSettings();
          })
      );
    if (Platform.isMacOS) {
      new Setting(containerEl)
        .setName("Hide instead of closing")
        .setDesc(
          "Enable to hide Obsidian instead of closing its last window, as the hide command in the app menu does. The vault stays loaded, so coming back is instant. Has no effect while another Obsidian window is open."
        )
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.hideOnMac)
            .onChange(async (value) => {
              this.plugin.settings.hideOnMac = value;
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
export default class NoEmptyWindows extends Plugin {
  settings: NoEmptyWindowsSettings;
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    this.addCommand({
      id: "close-tab-or-empty-window",
      name: "Close current tab or empty window",
      callback: () => this.closeTabOrWindow(),
    });
    // Capture phase, so this runs before Obsidian closes the tab itself.
    const onTabClose = (evt: MouseEvent) => {
      if (!this.settings.closeButton || !(evt.target instanceof Element))
        return;
      const header = evt.target.closest(".workspace-tab-header");
      if (!header) return;
      const viaButton =
        evt.type === "click" &&
        !!evt.target.closest(".workspace-tab-header-inner-close-button");
      const viaMiddleClick = evt.type === "auxclick" && evt.button === 1;
      if (!viaButton && !viaMiddleClick) return;
      // A double click, or one click too many while closing tabs quickly,
      // should not go on to close the window.
      if (evt.detail > 1) return;
      const leaves = this.getTabs();
      const leaf = leaves.find(
        (leaf) =>
          (leaf as unknown as { tabHeaderEl?: Element }).tabHeaderEl === header
      );
      // Pinned tabs are left to Obsidian.
      if (!leaf || leaf.getViewState().pinned) return;
      if (!this.closesWindow(leaf, leaves)) return;
      evt.preventDefault();
      evt.stopPropagation();
      this.closeOrHide(leaf.getContainer().win);
    };
    this.registerDomEvent(document, "click", onTabClose, { capture: true });
    this.registerDomEvent(document, "auxclick", onTabClose, { capture: true });
  }
  closeTabOrWindow() {
    const workspace = this.app.workspace;
    const leaves = this.getTabs();
    const activeLeaf = workspace.getMostRecentLeaf();
    if (!activeLeaf) return;
    if (this.settings.unpin && activeLeaf.getViewState().pinned) {
      activeLeaf.setPinned(false);
      return;
    }
    if (this.closesWindow(activeLeaf, leaves)) {
      this.closeOrHide(activeLeaf.getContainer().win);
      return;
    }
    // When the tab is the last one in its group, move to another group first.
    const activeGroup = activeLeaf.parent as unknown as TabGroup;
    if (leaves.length > 1 && activeGroup.children.length === 1) {
      const relatives = activeGroup.parent.children as TabGroup[];
      const groups =
        relatives.length > 1
          ? relatives
          : [
              ...new Set(
                leaves.map((leaf) => leaf.parent as unknown as TabGroup)
              ),
            ];
      const nextGroup = groups
        .filter((group) => group !== activeGroup)
        .sort((a, b) => a.children.length - b.children.length)[0];
      const nextActiveLeaf = nextGroup?.children[nextGroup.currentTab];
      if (nextActiveLeaf instanceof WorkspaceLeaf) {
        workspace.setActiveLeaf(nextActiveLeaf, { focus: true });
      }
    }
    activeLeaf.detach();
  }
  // Every tab in the main area and in popout windows. Sidebars are left out,
  // and tabs that have not loaded since a restart are counted.
  getTabs(): WorkspaceLeaf[] {
    const workspace = this.app.workspace;
    const leaves: WorkspaceLeaf[] = [];
    workspace.iterateAllLeaves((leaf) => {
      const root = leaf.getRoot();
      if (root !== workspace.leftSplit && root !== workspace.rightSplit) {
        leaves.push(leaf);
      }
    });
    return leaves;
  }
  closesWindow(leaf: WorkspaceLeaf, leaves: WorkspaceLeaf[]): boolean {
    return (
      leaves.length === 1 &&
      leaves[0] === leaf &&
      (!this.settings.allowEmpty || leaf.view.getViewType() === "empty")
    );
  }
  // Closing the main window closes the vault, so it has to load again when
  // the window is reopened. On macOS the app can be hidden instead (same as
  // cmd+H). Popout windows close normally.
  closeOrHide(win: Window) {
    const remote =
      this.settings.hideOnMac && Platform.isMacOS && win === window
        ? this.getElectronRemote()
        : null;
    // Hiding the app hides every window, so only do it when this is the only one.
    try {
      if (
        remote &&
        remote.BrowserWindow.getAllWindows().filter((w) => w.isVisible())
          .length === 1
      ) {
        remote.app.hide();
        return;
      }
    } catch {
      // fall through and close the window
    }
    win.close();
  }
  // Newer Obsidian builds ship @electron/remote; older ones expose it as
  // electron.remote.
  getElectronRemote(): ElectronRemote | null {
    const req = (window as unknown as { require?: (id: string) => unknown })
      .require;
    if (!req) return null;
    for (const load of [
      () => req("@electron/remote"),
      () => (req("electron") as { remote?: unknown }).remote,
    ]) {
      try {
        const remote = load() as Partial<ElectronRemote> | undefined;
        if (
          typeof remote?.app?.hide === "function" &&
          typeof remote?.BrowserWindow?.getAllWindows === "function"
        ) {
          return remote as ElectronRemote;
        }
      } catch {
        // module not available, try the next source
      }
    }
    return null;
  }
  onunload() {}
  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<NoEmptyWindowsSettings>
    );
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
