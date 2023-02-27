# no-empty-windows

This plugin provides an alternative to the "Close current tab" command in Obsidian ("workspace:close") for users who prefer more browser-like behavior where closing the last open tab closes the window but leaves the app running in the background for quicker relaunch.

"Close current tab or empty window" closes the currently focused tab unless it is pinned, in which case it either unpins the tab or closes it directly (toggleable via plugin settings). If tabs are open in multiple tab groups/popouts, the plugin will cycle through all open tabs until only one remains in the main window.

## Usage

To use this command, either invoke it from the Command Palette or map it to the Close current tab hotkey (cmd+W on MacOS by default).

## Installing

Look for this plugin under Community Plugins in the Obsidian settings, or unzip into [vault]/.obsidian/plugins/.
