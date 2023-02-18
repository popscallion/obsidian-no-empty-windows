import { Plugin, WorkspaceLeaf } from 'obsidian';
export default class NoEmptyWindows extends Plugin {
  async onload() {
    this.addCommand({
      id: "close-tab-or-empty-window",
      name: "Close current tab or empty window",
      callback: () => {
        const workspace = this.app.workspace
        const tabGroup = workspace.activeTabGroup
        const tabs = tabGroup.children
        if (tabs.length == 1) workspace.getFocusedContainer().win.close()
        const active = tabs[tabGroup.currentTab]
        if (!active.pinned) active.detach()
      },
    });
  }
  onunload() {
  }
}
