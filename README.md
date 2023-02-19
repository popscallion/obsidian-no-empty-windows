# obsidian-no-empty-windows

This plugin provides an alternative to the "Close current tab" command in Obsidian ("workspace:close"), and makes Obsidian windows behave more like MacOS browser windows.

"Close current tab or empty window" closes the currently focused tab unless it is pinned, in which case it does nothing. If there is only one tab left in the currently focused window, the command closes the window but leaves Obsidian running in the background, which allows it to relaunch faster and helps Obsidian URIs work better.

## Usage
To use this command, either invoke it from the Command Palette or map it to the Close current tab hotkey (cmd+W on MacOS by default).

## Installing

Look for this plugin under Community Plugins in the Obsidian settings, or unzip into [vault]/.obsidian/plugins/.