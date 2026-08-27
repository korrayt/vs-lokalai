import * as vscode from 'vscode';
import { LocalAIProvider } from './providers/localAIProvider';
import { WorkspaceMemory } from './memory/workspaceMemory';
import { ChatWebviewProvider } from './ui/chatPanel';

export function activate(context: vscode.ExtensionContext) {
  const provider = new LocalAIProvider();
  const chatWebview = new ChatWebviewProvider(context.extensionUri);

  // Register Webview Sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatWebviewProvider.viewType, chatWebview)
  );

  // Command: Open Chat
  context.subscriptions.push(
    vscode.commands.registerCommand('vs-lokalai.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.vs-lokalai-sidebar');
    })
  );

  // Command: Explain Selection
  context.subscriptions.push(
    vscode.commands.registerCommand('vs-lokalai.explainSelection', async () => {
      const editorCtx = await WorkspaceMemory.getActiveEditorContext();
      if (!editorCtx || !editorCtx.content) {
        vscode.window.showInformationMessage('Please select code to explain.');
        return;
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'VS LokalAI: Analyzing code...',
          cancellable: false
        },
        async () => {
          try {
            const explanation = await provider.generateChatResponse([
              {
                role: 'system',
                content: 'You are an expert software engineer. Explain the provided code clearly and concisely.'
              },
              {
                role: 'user',
                content: `Explain this code:\n\`\`\`${editorCtx.languageId}\n${editorCtx.content}\n\`\`\``
              }
            ]);

            const doc = await vscode.workspace.openTextDocument({
              content: `# Code Explanation (${editorCtx.filename})\n\n${explanation}`,
              language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
          } catch (err: any) {
            vscode.window.showErrorMessage(`VS LokalAI Error: ${err.message}`);
          }
        }
      );
    })
  );

  // Command: Refactor Selection
  context.subscriptions.push(
    vscode.commands.registerCommand('vs-lokalai.refactorSelection', async () => {
      const editorCtx = await WorkspaceMemory.getActiveEditorContext();
      if (!editorCtx || !editorCtx.content) {
        vscode.window.showInformationMessage('Please select code to refactor.');
        return;
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'VS LokalAI: Refactoring code...',
          cancellable: false
        },
        async () => {
          try {
            const refactored = await provider.generateChatResponse([
              {
                role: 'system',
                content: 'You are a clean code and performance optimization specialist. Refactor the given code to improve readability, performance, and best practices. Return ONLY the refactored code and bulleted improvements.'
              },
              {
                role: 'user',
                content: `Refactor this code:\n\`\`\`${editorCtx.languageId}\n${editorCtx.content}\n\`\`\``
              }
            ]);

            const doc = await vscode.workspace.openTextDocument({
              content: `# Refactored Code (${editorCtx.filename})\n\n${refactored}`,
              language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
          } catch (err: any) {
            vscode.window.showErrorMessage(`VS LokalAI Error: ${err.message}`);
          }
        }
      );
    })
  );

  // Status bar indicator
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = '$(hubot) LokalAI';
  statusBar.tooltip = `VS LokalAI: ${provider.model} (${provider.provider})`;
  statusBar.command = 'vs-lokalai.openChat';
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function deactivate() {}
