/**
 * Every request the app makes to Ollama, the local model server.
 * API reference: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
import { MODEL_NOTES } from "./models.js";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";

// Where every request goes. Changed from Settings through chat.setEndpoint().
let baseUrl = DEFAULT_OLLAMA_URL;
export const setOllamaUrl = (url) => (baseUrl = url);

/**
 * Tidy what the user typed into a base URL: "192.168.1.5:11434" -> "http://192.168.1.5:11434".
 * Throws with a readable message when it isn't a web address. Empty means the default.
 */
export function normalizeUrl(input) {
  let url = String(input || "").trim();
  if (!url) return DEFAULT_OLLAMA_URL;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(url)) url = `http://${url}`;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That doesn't look like a web address.");
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Use an http:// or https:// address.");
  // A path is kept (for a server behind a proxy); a trailing slash, query or hash is not.
  return (parsed.origin + parsed.pathname).replace(/\/+$/, "");
}

const post = (path, body, signal) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

/** The installed models, merged with our notes from models.js, in menu order. */
export async function listModels() {
  const response = await fetch(`${baseUrl}/api/tags`);
  if (!response.ok) throw new Error(`${response.status}`);
  const { models = [] } = await response.json();
  return models.map(toModel).sort((a, b) => a.order - b.order);
}

function toModel(m) {
  const notes = MODEL_NOTES[m.name] || {};
  return {
    name: m.name, // the tag /api/chat expects
    label: notes.nickname || notes.name || m.name, // what the UI shows
    fullName: notes.nickname ? notes.name : "",
    uncensored: !!notes.uncensored,
    uses: notes.uses || [],
    order: notes.order ?? Infinity,
    params: m.details?.parameter_size || "",
    quant: m.details?.quantization_level || "",
    size: `${(m.size / 1e9).toFixed(1)} GB`,
    context: m.details?.context_length || 0, // 0 on servers that don't report it
  };
}

/**
 * Send the conversation and stream the reply.
 * `onChunk({ content, thinking })` is called for every piece that arrives.
 */
export async function streamChat({ model, messages, think, signal, onChunk }) {
  const response = await post("/api/chat", { model, messages, think, stream: true }, signal);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);

  // The reply is one JSON object per line. A read can stop mid-line,
  // so the unfinished last line waits in `buffer` for the next read.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line);
      if (chunk.error) throw new Error(chunk.error);
      if (chunk.message) onChunk(chunk.message);
    }
  }
}

/** Unload the model (freeing the old chat's cache), then load it again so the next message starts fast. */
export async function reloadModel(model) {
  await post("/api/chat", { model, messages: [], keep_alive: 0 });
  await post("/api/chat", { model, messages: [] });
}
