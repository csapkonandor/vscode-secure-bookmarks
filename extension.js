const vscode = require("vscode");
const path = require("path");

function activate(context) {
  const addBookmark = vscode.commands.registerCommand(
    "secureBookmarks.add",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const pos = editor.selection.active;
      const file = editor.document.uri.fsPath;

      const bookmarks = await loadBookmarks();
      // Look for exact match
      const idx = bookmarks.findIndex(
        b => b.file === file && b.line === pos.line && b.character === pos.character
      );

      if (idx !== -1) {
        return;
      }

      bookmarks.push({ file, line: pos.line, character: pos.character });

      await saveBookmarks(bookmarks);

      vscode.window.showInformationMessage("Bookmark saved.");
    }
  );

  const gotoBookmark = vscode.commands.registerCommand(
    "secureBookmarks.goto",
    async () => {
      const bookmarks = await loadBookmarks();
      if (bookmarks.length === 0) {
        vscode.window.showInformationMessage("No bookmarks found.");
        return;
      }

      const pick = await vscode.window.showQuickPick(
        bookmarks.map((b, i) => ({
          label: path.basename(b.file),
          description: `${b.file} — line ${b.line + 1}`,
          index: i
        }))
      );

      if (!pick) return;

      await jumpToBookmark(bookmarks[pick.index]);
    }
  );

  const deleteBookmark = vscode.commands.registerCommand(
    "secureBookmarks.delete",
    async () => {
      const bookmarks = await loadBookmarks();
      if (bookmarks.length === 0) {
        vscode.window.showInformationMessage("No bookmarks to delete.");
        return;
      }

      const pick = await vscode.window.showQuickPick(
        bookmarks.map((b, i) => ({
          label: path.basename(b.file),
          description: `${b.file} — line ${b.line + 1}`,
          index: i
        }))
      );

      if (!pick) return;

      bookmarks.splice(pick.index, 1);
      await saveBookmarks(bookmarks);

      vscode.window.showInformationMessage("Bookmark deleted.");
    }
  );

  const deleteAllBookmarks = vscode.commands.registerCommand(
    "secureBookmarks.deleteAll",
    async () => {
      await saveBookmarks([]);
      vscode.window.showInformationMessage("All bookmarks deleted.");
    }
  );

  const gotoNext = vscode.commands.registerCommand(
    "secureBookmarks.next",
    async () => {
      const bookmarks = await loadBookmarks();
      if (bookmarks.length === 0) {
        vscode.window.showInformationMessage("No bookmarks found.");
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const currentFile = editor.document.uri.fsPath;
      const pos = editor.selection.active;
      const currentLine = pos.line;
      const currentChar = pos.character;

      const sorted = sortBookmarks(bookmarks);

      // Try to find exact match first
      let idx = sorted.findIndex(
        b => b.file === currentFile && b.line === currentLine && b.character === currentChar
      );

      if (idx !== -1) {
        // Exactly on a bookmark → go to next (ring style)
        idx = (idx + 1) % sorted.length;
      } else {
        // Not exactly on a bookmark → find the next one after current position
        idx = sorted.findIndex(
          b => b.file > currentFile || (b.file === currentFile && b.line > currentLine) || (b.file === currentFile && b.line === currentLine && b.character > currentChar)
        );
        // If still not found, wrap to first
        if (idx === -1) idx = 0;
      }

      await jumpToBookmark(sorted[idx]);
    }
  );

  const gotoPrevious = vscode.commands.registerCommand(
    "secureBookmarks.previous",
    async () => {
      const bookmarks = await loadBookmarks();
      if (bookmarks.length === 0) {
        vscode.window.showInformationMessage("No bookmarks found.");
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const currentFile = editor.document.uri.fsPath;
      const pos = editor.selection.active;
      const currentLine = pos.line;
      const currentChar = pos.character;

      const sorted = sortBookmarks(bookmarks);

      // Try to find exact match first
      let idx = sorted.findIndex(
        b => b.file === currentFile && b.line === currentLine &&  b.character === currentChar
      );

      if (idx !== -1) {
        // Exactly on a bookmark → go to previous (ring style)
        idx = (idx - 1 + sorted.length) % sorted.length;
      } else {
        // Not exactly on a bookmark → find the next one after current position
        idx = sorted.findLastIndex(
          b => b.file < currentFile || (b.file === currentFile && b.line < currentLine) || (b.file === currentFile && b.line  === currentLine && b.character < currentChar)
        );
        // If still not found, wrap to last
        if (idx === -1) idx = sorted.length - 1;
      }

      await jumpToBookmark(sorted[idx]);
    }
  );

  const toggleBookmark = vscode.commands.registerCommand(
    "secureBookmarks.toggle",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const pos = editor.selection.active;
      const file = editor.document.uri.fsPath;

      const bookmarks = await loadBookmarks();

      // Look for exact match
      const idx = bookmarks.findIndex(
        b => b.file === file && b.line === pos.line && b.character === pos.character
      );

      if (idx !== -1) {
        // Remove existing bookmark
        bookmarks.splice(idx, 1);
        await saveBookmarks(bookmarks);
        vscode.window.showInformationMessage("Bookmark removed.");
      } else {
        // Add new bookmark
        bookmarks.push({ file, line: pos.line, character: pos.character });
        await saveBookmarks(bookmarks);
        vscode.window.showInformationMessage("Bookmark added.");
      }
    }
  );


  context.subscriptions.push(
    addBookmark,
    gotoBookmark,
    deleteBookmark,
    deleteAllBookmarks,
    gotoNext,
    gotoPrevious,
    toggleBookmark
  );
}

async function jumpToBookmark(b) {
  const doc = await vscode.workspace.openTextDocument(b.file);
  const editor = await vscode.window.showTextDocument(doc);

  const pos = new vscode.Position(b.line, b.character);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos));
}

function sortBookmarks(bookmarks) {
  return bookmarks.slice().sort((a, b) => {
    if (a.file < b.file) return -1;
    if (a.file > b.file) return 1;
    if (a.line < b.line) return -1;
    if (a.line > b.line) return 1;
    return a.character - b.character;
  });
}

async function loadBookmarks() {
  const fileUri = getBookmarksFileUri();
  if (!fileUri) return [];

  try {
    const data = await vscode.workspace.fs.readFile(fileUri);
    return JSON.parse(Buffer.from(data).toString("utf8"));
  } catch {
    return [];
  }
}

async function saveBookmarks(bookmarks) {
  const fileUri = getBookmarksFileUri();
  if (!fileUri) return;

  const folderUri = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders[0].uri,
    ".vscode"
  );

  try {
    await vscode.workspace.fs.createDirectory(folderUri);

    const encoded = Buffer.from(JSON.stringify(bookmarks, null, 2), "utf8");
    await vscode.workspace.fs.writeFile(fileUri, encoded);
  } catch (err) {
    console.error("Failed to save bookmarks:", err);
  }
}

function getBookmarksFileUri() {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return null;
  }

  return vscode.Uri.joinPath(workspace.uri, ".vscode", "bookmarks.json");
}

function deactivate() {}

module.exports = { activate, deactivate };

