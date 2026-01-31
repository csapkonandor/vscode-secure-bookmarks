const vscode = require("vscode");
const fs = require("fs");
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

      vscode.window.showInformationMessage("Bookmark saved to .vscode/bookmarks.json");
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

  context.subscriptions.push(addBookmark, gotoBookmark);
}

async function loadBookmarks() {
  const filePath = getBookmarksFilePath();
  if (!filePath) return [];

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read bookmarks:", err);
  }

  return [];
}

async function saveBookmarks(bookmarks) {
  const filePath = getBookmarksFilePath();
  if (!filePath) return;

  const folder = path.dirname(filePath);

  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    fs.writeFileSync(filePath, JSON.stringify(bookmarks, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save bookmarks:", err);
  }
}

function getBookmarksFilePath() {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return "";
  }

  return path.join(workspace.uri.fsPath, ".vscode", "bookmarks.json");
}

function deactivate() {}

module.exports = { activate, deactivate };
