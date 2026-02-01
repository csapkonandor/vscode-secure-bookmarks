# Secure Bookmarks

A minimal, secure VS Code extension that stores bookmarks inside your workspace at:

.vscode/bookmarks.json


## Commands

### "Secure Bookmarks: Add Bookmark"
Adds a bookmark for the current cursor position.

### "Secure Bookmarks: Go to Bookmark"
Shows a list of saved bookmarks and jumps to the selected one.

### "Secure Bookmarks: Delete Bookmark"
Shows a list of saved bookmarks and deletes to the selected one.

### "Secure Bookmarks: Delete All Bookmarks"
Deletes all bookmarks.

### "Secure Bookmarks: Go to Next Bookmark"
Jumps to the next bookmark (if at the end, wraps to the first).

### "Secure Bookmarks: Go to Previous Bookmark"
Jumps to the previous bookmark (if at the beginning, wraps to the last).

### "Secure Bookmarks: Toggle Bookmark"
Toogles current position. Adds or removes it .

## Storage

Bookmarks are stored in:

.vscode/bookmarks.json

This keeps everything local, transparent, and version‑controllable.


