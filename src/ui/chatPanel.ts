import * as vscode from 'vscode';
import { LocalAIProvider, ChatMessage } from '../providers/localAIProvider';
import { WorkspaceMemory } from '../memory/workspaceMemory';

export class ChatWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vs-lokalai.chatView';
  private _view?: vscode.WebviewView;
  private _provider: LocalAIProvider;
  private _messages: ChatMessage[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._provider = new LocalAIProvider();
    this._messages.push({
      role: 'system',
      content:
        'You are VS LokalAI, an expert, privacy-first local AI assistant running entirely on the developer\'s local machine. Provide precise, clean, production-ready code with concise explanations.'
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage': {
          await this.handleUserMessage(data.value);
          break;
        }
        case 'refreshStatus': {
          this.sendStatusUpdate();
          break;
        }
      }
    });

    this.sendStatusUpdate();
  }

  public async handleUserMessage(promptText: string) {
    if (!this._view) return;

    // Get active file context if workspace memory is enabled
    const editorCtx = await WorkspaceMemory.getActiveEditorContext();
    let enrichedPrompt = promptText;

    if (editorCtx && editorCtx.content) {
      enrichedPrompt = `[Current File: ${editorCtx.relativePath} (${editorCtx.languageId})]\n\`\`\`${editorCtx.languageId}\n${editorCtx.content.slice(0, 3000)}\n\`\`\`\n\nTask: ${promptText}`;
    }

    this._messages.push({ role: 'user', content: enrichedPrompt });
    this._view.webview.postMessage({ type: 'userMessage', value: promptText });

    this._view.webview.postMessage({ type: 'startAssistantMessage' });

    try {
      let accumulated = '';
      await this._provider.generateChatResponse(this._messages, (token) => {
        accumulated += token;
        this._view?.webview.postMessage({ type: 'appendToken', value: token });
      });

      this._messages.push({ role: 'assistant', content: accumulated });
      this._view.webview.postMessage({ type: 'endAssistantMessage' });
    } catch (err: any) {
      this._view.webview.postMessage({
        type: 'errorMessage',
        value: `Error: ${err.message}. Make sure Ollama or your local AI server is running at ${this._provider.endpoint}.`
      });
    }
  }

  private sendStatusUpdate() {
    this._view?.webview.postMessage({
      type: 'statusUpdate',
      provider: this._provider.provider,
      endpoint: this._provider.endpoint,
      model: this._provider.model
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 10px;
      margin: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
    }
    .header {
      font-size: 11px;
      padding: 6px 10px;
      background: var(--vscode-sideBarSectionHeader-background);
      border-radius: 4px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .chat-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-bottom: 10px;
    }
    .message {
      padding: 8px 12px;
      border-radius: 6px;
      line-height: 1.4;
      word-wrap: break-word;
      font-size: 13px;
    }
    .message.user {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      align-self: flex-end;
      max-width: 85%;
    }
    .message.assistant {
      background: var(--vscode-editor-inactiveSelectionBackground);
      align-self: flex-start;
      max-width: 95%;
    }
    .message.error {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      color: var(--vscode-errorForeground);
    }
    pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .input-area {
      display: flex;
      gap: 6px;
      margin-top: auto;
      padding-top: 8px;
    }
    textarea {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px;
      resize: none;
      font-family: inherit;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="header">
    <span id="status-model">Model: Local</span>
    <span id="status-conn" style="color: #4CAF50;">â— Connected</span>
  </div>
  <div class="chat-container" id="chat">
    <div class="message assistant">
      ğŸ‘‹ Merhaba! Ben <strong>VS LokalAI</strong>. Tamamen yerel makinenizde Ã§alÄ±ÅŸan, kodlarÄ±nÄ±zÄ± asla buluta gÃ¶ndermeyen yapay zekÃ¢ asistanÄ±nÄ±zÄ±m. Kodunuz hakkÄ±nda soru sorabilir veya refactoring isteyebilirsiniz.
    </div>
  </div>
  <div class="input-area">
    <textarea id="prompt" rows="2" placeholder="Kod sor veya istek yaz... (Enter)"></textarea>
    <button id="sendBtn">GÃ¶nder</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const chat = document.getElementById('chat');
    const promptInput = document.getElementById('prompt');
    const sendBtn = document.getElementById('sendBtn');
    let currentAssistantEl = null;

    sendBtn.addEventListener('click', send);
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    function send() {
      const text = promptInput.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'sendMessage', value: text });
      promptInput.value = '';
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'userMessage') {
        const el = document.createElement('div');
        el.className = 'message user';
        el.textContent = msg.value;
        chat.appendChild(el);
        chat.scrollTop = chat.scrollHeight;
      } else if (msg.type === 'startAssistantMessage') {
        currentAssistantEl = document.createElement('div');
        currentAssistantEl.className = 'message assistant';
        chat.appendChild(currentAssistantEl);
      } else if (msg.type === 'appendToken') {
        if (currentAssistantEl) {
          currentAssistantEl.textContent += msg.value;
          chat.scrollTop = chat.scrollHeight;
        }
      } else if (msg.type === 'errorMessage') {
        const el = document.createElement('div');
        el.className = 'message error';
        el.textContent = msg.value;
        chat.appendChild(el);
        chat.scrollTop = chat.scrollHeight;
      } else if (msg.type === 'statusUpdate') {
        document.getElementById('status-model').textContent = msg.model + ' (' + msg.provider + ')';
      }
    });
  </script>
</body>
</html>`;
  }
}
