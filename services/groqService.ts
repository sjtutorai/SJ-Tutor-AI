// Groq API Fallback Service for SJ Tutor AI
// Supports high-speed inference via Llama 3.3 70B & Mixtral models

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export const GroqService = {
  getApiKey: (): string => {
    return (
      (typeof process !== 'undefined' && (process.env.GROQ_API_KEY || (process.env as any).VITE_GROQ_API_KEY)) ||
      (typeof window !== 'undefined' && ((window as any).__GROQ_API_KEY__ || localStorage.getItem('sjtutor_groq_api_key'))) ||
      ''
    );
  },

  isAvailable: (): boolean => {
    return !!GroqService.getApiKey();
  },

  /**
   * Complete a chat prompt with Groq (OpenAI-compatible API format)
   */
  chatCompletion: async (params: {
    messages: GroqMessage[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
    jsonMode?: boolean;
  }): Promise<string> => {
    const apiKey = GroqService.getApiKey();
    if (!apiKey) {
      throw new Error("GROQ_API_KEY_MISSING: Groq API key is not configured.");
    }

    const model = params.model || "llama-3.3-70b-versatile";

    const formattedMessages = params.messages.map(msg => {
      // If content is string or simple array
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      // If content has parts or objects, flatten to text for standard text completion
      if (Array.isArray(msg.content)) {
        const textParts = msg.content
          .map(p => (typeof p === 'string' ? p : p.text || ''))
          .join('\n');
        return { role: msg.role, content: textParts || ' ' };
      }
      return { role: msg.role, content: String(msg.content) };
    });

    const body: any = {
      model,
      messages: formattedMessages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
    };

    if (params.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[Groq API Error Status]:", response.status, errorText);
      throw new Error(`Groq API Error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";
    return reply;
  },

  /**
   * Stream a chat prompt from Groq with async generator
   */
  chatCompletionStream: async function* (params: {
    messages: GroqMessage[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): AsyncGenerator<{ text: string }> {
    const apiKey = GroqService.getApiKey();
    if (!apiKey) {
      throw new Error("GROQ_API_KEY_MISSING: Groq API key is not configured.");
    }

    const model = params.model || "llama-3.3-70b-versatile";

    const formattedMessages = params.messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      if (Array.isArray(msg.content)) {
        const textParts = msg.content
          .map(p => (typeof p === 'string' ? p : p.text || ''))
          .join('\n');
        return { role: msg.role, content: textParts || ' ' };
      }
      return { role: msg.role, content: String(msg.content) };
    });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[Groq Stream Error]:", response.status, errorText);
      throw new Error(`Groq Stream Error (${response.status}): ${errorText || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to read response stream from Groq");
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.replace(/^data:\s*/, "");
        if (dataStr === "[DONE]") return;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          if (delta) {
            yield { text: delta };
          }
        } catch {
          // ignore partial JSON parse errors
        }
      }
    }
  }
};
