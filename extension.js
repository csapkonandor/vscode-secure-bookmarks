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

      const b = bookmarks[pick.index];
      const doc = await vscode.workspace.openTextDocument(b.file);
      const editor = await vscode.window.showTextDocument(doc);

      const pos = new vscode.Position(b.line, b.character);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos));
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
      await saveBookmarks([]); // write empty array
      vscode.window.showInformationMessage("All bookmarks deleted.");
    }
  );

  context.subscriptions.push(
    addBookmark,
    gotoBookmark,
    deleteBookmark,
    deleteAllBookmarks
  );
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
    // Ensure .vscode folder exists
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

