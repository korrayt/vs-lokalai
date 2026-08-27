import * as vscode from 'vscode';
import * as path from 'path';

export interface CodeContext {
  filename: string;
  relativePath: string;
  languageId: string;
  content: string;
  selectedRange?: string;
}

export class WorkspaceMemory {
  public static async getActiveEditorContext(): Promise<CodeContext | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;

    const doc = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
    const relativePath = workspaceFolder
      ? path.relative(workspaceFolder.uri.fsPath, doc.uri.fsPath)
      : path.basename(doc.uri.fsPath);

    const selection = editor.selection;
    let selectedText = '';
    let selectedRange: string | undefined;

    if (!selection.isEmpty) {
      selectedText = doc.getText(selection);
      selectedRange = `Lines ${selection.start.line + 1}-${selection.end.line + 1}`;
    }

    return {
      filename: path.basename(doc.uri.fsPath),
      relativePath,
      languageId: doc.languageId,
      content: selectedText || doc.getText(),
      selectedRange
    };
  }

  public static async getWorkspaceOverview(): Promise<string> {
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,js,tsx,jsx,py,rs,go,java,c,cpp,html,css,json,md}',
      '**/node_modules/**',
      20
    );

    if (files.length === 0) return 'No code files detected.';

    return files.map((f) => path.basename(f.fsPath)).join(', ');
  }
}
