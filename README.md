# VS LokalAI ğŸ¤–

> **Privacy-First, Zero-Cloud Local AI Coding Assistant for Visual Studio Code.**  
> Powered by **Ollama**, **LM Studio**, and **LocalAI**. $0.00 Token SLA. 100% On-Device.

---

## âœ¨ Features

- ğŸ”’ **100% Offline & Private**: Your code never leaves your local workstation. Zero cloud telemetry.
- âš¡ **Multi-Backend Support**: Seamlessly connect to **Ollama** (`localhost:11434`), **LM Studio** (`localhost:1234`), or custom OpenAI-compatible endpoints.
- ğŸ§  **Context & Workspace Memory**: Automatically captures active file syntax, selections, and imports for instant zero-shot completions.
- ğŸ’¬ **Interactive Sidebar Chat**: Native VS Code Webview sidebar with streaming responses and markdown syntax highlighting.
- ğŸ› ï¸ **Integrated Actions**:
  - `Explain Selection`: Break down complex algorithms and unfamiliar syntax.
  - `Refactor Selection`: Optimize performance, modernize syntax, and adhere to SOLID principles.
  - `Generate Tests`: Auto-generate unit test suites (Vitest, Jest, PyTest, Rust tests).

---

## ğŸš€ Getting Started

### 1. Prerequisites
Install and run your preferred local model provider:
- **Ollama**:
  ```bash
  ollama run qwen2.5-coder:7b
  ```
- **LM Studio**:
  - Start local inference server on port `1234`.

### 2. Configuration Settings in VS Code
Open `settings.json` or Extension Settings:
```json
{
  "vsLokalAI.provider": "ollama",
  "vsLokalAI.endpoint": "http://localhost:11434",
  "vsLokalAI.model": "qwen2.5-coder:7b",
  "vsLokalAI.temperature": 0.2,
  "vsLokalAI.enableWorkspaceMemory": true
}
```

### 3. Build & Install Locally
```bash
npm install
npm run compile
```

---

## ğŸ›¡ï¸ License
MIT License. Created & maintained by [Koray TaÅŸan](https://github.com/korrayt).
