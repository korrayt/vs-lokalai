import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LocalAIProvider {
  private get config() {
    return vscode.workspace.getConfiguration('vsLokalAI');
  }

  public get endpoint(): string {
    return this.config.get<string>('endpoint', 'http://localhost:11434');
  }

  public get model(): string {
    return this.config.get<string>('model', 'qwen2.5-coder:7b');
  }

  public get provider(): string {
    return this.config.get<string>('provider', 'ollama');
  }

  public get temperature(): number {
    return this.config.get<number>('temperature', 0.2);
  }

  public async generateChatResponse(
    messages: ChatMessage[],
    onToken?: (token: string) => void
  ): Promise<string> {
    if (this.provider === 'ollama') {
      return this.callOllamaChat(messages, onToken);
    } else {
      return this.callOpenAICompatibleChat(messages, onToken);
    }
  }

  private async callOllamaChat(
    messages: ChatMessage[],
    onToken?: (token: string) => void
  ): Promise<string> {
    const url = new URL('/api/chat', this.endpoint);
    const body = JSON.stringify({
      model: this.model,
      messages: messages,
      stream: true,
      options: {
        temperature: this.temperature
      }
    });

    return new Promise((resolve, reject) => {
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          let fullText = '';
          res.setEncoding('utf8');

          res.on('data', (chunk: string) => {
            const lines = chunk.split('\n').filter(Boolean);
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.message && parsed.message.content) {
                  const token = parsed.message.content;
                  fullText += token;
                  if (onToken) {
                    onToken(token);
                  }
                }
              } catch {
                // partial chunk
              }
            }
          });

          res.on('end', () => resolve(fullText));
        }
      );

      req.on('error', (err) => {
        reject(new Error(`Ollama connection error (${this.endpoint}): ${err.message}`));
      });

      req.write(body);
      req.end();
    });
  }

  private async callOpenAICompatibleChat(
    messages: ChatMessage[],
    onToken?: (token: string) => void
  ): Promise<string> {
    const url = new URL('/v1/chat/completions', this.endpoint);
    const body = JSON.stringify({
      model: this.model,
      messages: messages,
      stream: false,
      temperature: this.temperature
    });

    return new Promise((resolve, reject) => {
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          let rawData = '';
          res.setEncoding('utf8');

          res.on('data', (chunk) => {
            rawData += chunk;
          });

          res.on('end', () => {
            try {
              const parsed = JSON.parse(rawData);
              const content = parsed.choices?.[0]?.message?.content || '';
              if (onToken) onToken(content);
              resolve(content);
            } catch (e: any) {
              reject(new Error(`Failed to parse local AI response: ${e.message}`));
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(new Error(`Local AI backend error (${this.endpoint}): ${err.message}`));
      });

      req.write(body);
      req.end();
    });
  }
}
