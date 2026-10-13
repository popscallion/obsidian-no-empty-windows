# no-empty-windows

This plugin provides an alternative to the "Close current tab" command in Obsidian ("workspace:close") for users who prefer more browser-like behavior where closing the last open tab closes the window but leaves the app running in the background for quicker relaunch.

"Close current tab or empty window" closes the currently focused tab unless it is pinned, in which case it either unpins the tab or closes it directly (toggleable via plugin settings). If tabs are open in multiple tab groups/popouts, the plugin will cycle through all open tabs until only one remains in the main window.

## Usage

To use this command, either invoke it from the Command Palette or map it to the Close current tab hotkey (cmd+W on MacOS by default). The plugin does not take over cmd+W by itself: remove the hotkey from "Close current tab" and assign it to "No Empty Windows: Close current tab or empty window".

With the default settings the last tab closes to an empty tab first, and the window closes when that empty tab is closed. Turn off "Allow empty tabs" to close the window right away.

The close button on the last tab (and a middle click on it) closes the window in the same cases. Pinned tabs are left to Obsidian, and a double click never closes the window. This can be turned off in the plugin settings. Closing a tab from its right-click menu is not covered.

Tabs in the sidebars do not count as open tabs.

## Settings

- **Unpin tabs**: unpin a pinned tab instead of closing it directly.
- **Allow empty tabs**: when off, closing the last tab closes the window immediately instead of leaving an empty tab.
- **Close button**: also close the window from the last tab's close button and from a middle click on it.
- **Hide instead of closing** (macOS only, off by default): hide Obsidian, like cmd+H, instead of closing its last window. Closing the main window closes the vault, so it has to load again when you come back; hiding keeps it loaded. It has no effect while another Obsidian window is open, because hiding the app hides all of its windows.

## Installing

Look for this plugin under Community Plugins in the Obsidian settings, or unzip into [vault]/.obsidian/plugins/.
