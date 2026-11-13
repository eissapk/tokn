import { store } from "olum";
import { listModels, reloadModel, streamChat } from "./ollama.js";
import { deleteSession, listSessions, saveSession } from "./sessions.js";

/**
 * The app's shared state, and every action that changes it.
 * Components read `chat.*` to render and call `chat.*()` to act.
 */

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// localStorage can throw in a locked-down profile; then settings just aren't remembered.
const remember = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};
const recall = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// About 4 characters per token: close enough for the context meter.
const estimateTokens = (text) => Math.ceil(String(text || "").length / 4);

// The sidebar label: the first message's text (or its file names).
const titleFor = (messages) => {
  const first = messages.find((m) => m.role === "user");
  const label = first?.text || (first?.files || []).map((f) => f.name).join(", ") || "New chat";
  return label.replace(/\s+/g, " ").trim().slice(0, 60);
};

// What the model reads: each file in its own <file> tag (``` fences would break on
// files that contain ```), then the question last, right before the answer starts.
const buildPrompt = (text, files) => {
  if (!files.length) return text;
  const blocks = files.map((f) => `<file name="${f.name}">\n${f.content.trimEnd()}\n</file>`).join("\n\n");
  const ask = text || (files.length === 1 ? "Please review this file." : "Please review these files.");
  return `I've attached ${files.length === 1 ? "a file" : `${files.length} files`}.\n\n${blocks}\n\n${ask}`;
};

const applyTheme = (theme) => document.documentElement.classList.toggle("dark", theme === "dark");

// Stops the reply that is streaming. Not in the store: the UI never renders it.
let controller = null;
const stopStreaming = () => controller?.abort();

export const chat = store({
  server: "connecting", // "connecting" | "connected" | "offline"
  models: [], // installed models, see toModel() in ollama.js
  model: "", // tag of the selected model

  messages: [], // the open chat: { id, role: "user" | "assistant", content, text?, files?, thinking? }
  sending: false, // true while a reply streams in
  sessionId: null, // the saved chat `messages` belongs to; null until its first message is sent
  sessions: [], // every saved chat: { id, title, starred?, createdAt, updatedAt, messages }

  theme: "light",
  sidebar: window.innerWidth >= 768,

  /* ---- reads ---- */

  current() {
    return this.models.find((m) => m.name === this.model) || { label: "", context: 0 };
  },

  contextUsed() {
    return this.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  },

  /** Sidebar order: starred chats first, each group newest first. */
  orderedSessions() {
    return [...this.sessions.filter((s) => s.starred), ...this.sessions.filter((s) => !s.starred)];
  },

  /* ---- startup ---- */

  async loadModels() {
    try {
      this.models = await listModels();
      this.server = "connected";
    } catch {
      this.server = "offline";
    }
    const saved = recall("Buildr-model");
    this.model = this.models.some((m) => m.name === saved) ? saved : this.models[0]?.name || "";
  },

  loadTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.theme = recall("Buildr-theme") || (prefersDark ? "dark" : "light");
    applyTheme(this.theme);
  },

  // Merged rather than replaced, in case a chat was started before the disk answered.
  async loadSessions() {
    for (const s of await listSessions()) {
      if (!this.sessions.some((x) => x.id === s.id)) this.sessions.push(s);
    }
    this.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /* ---- settings ---- */

  selectModel(name) {
    this.model = name;
    remember("Buildr-model", name);
  },

  toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    applyTheme(this.theme);
    remember("Buildr-theme", this.theme);
  },

  toggleSidebar() {
    this.sidebar = !this.sidebar;
  },

  /* ---- chatting ---- */

  async send(text, files, think) {
    // `content` is what the model reads (files included); `text` and `files` are what the bubble shows.
    this.messages.push({
      id: newId(),
      role: "user",
      content: buildPrompt(text, files),
      text,
      files: files.map(({ id, name }) => ({ id, name })),
    });
    const history = this.messages.map(({ role, content }) => ({ role, content }));
    this.messages.push({ id: newId(), role: "assistant", content: "", thinking: "" });
    const reply = this.messages[this.messages.length - 1]; // read back from the store, so edits re-render

    // Keep the chat's id: if the user switches chats mid-reply, saves still land in this one.
    const sessionId = this.save();
    let savedAt = Date.now();
    this.sending = true;
    controller = new AbortController();

    try {
      await streamChat({
        model: this.model,
        messages: history,
        think,
        signal: controller.signal,
        onChunk: ({ content, thinking }) => {
          if (thinking) reply.thinking += thinking;
          if (content) reply.content += content;
          if (Date.now() - savedAt > 1000) {
            savedAt = Date.now();
            this.save(sessionId);
          }
        },
      });
    } catch (err) {
      if (err.name !== "AbortError") reply.content += `${reply.content ? "\n\n" : ""}**Error:** ${err.message}`;
      else if (!reply.content) reply.content = "_Stopped._";
    } finally {
      controller = null;
      this.sending = false;
      this.save(sessionId);
    }
  },

  stop() {
    stopStreaming();
  },

  /** Start a fresh chat. The old one stays in the sidebar; the model is reloaded to drop its cache. */
  newChat() {
    if (!this.messages.length) return;
    stopStreaming();
    this.messages = [];
    this.sessionId = null;
    if (this.model) reloadModel(this.model).catch((err) => console.error("Failed to reset the model:", err.message));
  },

  /* ---- saved chats ----
     Note: the store only unwraps a reactive object when it is assigned directly
     (this.x = obj). So `sessions` is only changed in place (push, unshift, splice,
     sort), and a session shares its `messages` array with `chat.messages`. */

  /** Save a chat to disk (by default the open one, which is created on its first save). Returns its id. */
  save(id = this.sessionId) {
    let session = id && this.sessions.find((s) => s.id === id);

    if (!session) {
      if (id || !this.messages.length) return id; // deleted mid-reply, or nothing to save
      const now = Date.now();
      this.sessions.unshift({ id: newId(), title: titleFor(this.messages), createdAt: now, updatedAt: now, messages: [] });
      session = this.sessions[0];
      session.messages = this.messages;
      this.sessionId = session.id;
    }

    session.updatedAt = Date.now();
    this.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    saveSession(session);
    return session.id;
  },

  openSession(id) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session || id === this.sessionId) return;
    stopStreaming();
    this.sessionId = id;
    this.messages = session.messages;
  },

  /** Open the next (1) or previous (-1) chat in sidebar order. */
  stepSession(direction) {
    const list = this.orderedSessions();
    const at = list.findIndex((s) => s.id === this.sessionId);
    const next = list[Math.min(Math.max(at + direction, 0), list.length - 1)];
    if (next) this.openSession(next.id);
  },

  // Starring doesn't touch updatedAt, so it doesn't reorder the list.
  toggleStar(id) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) return;
    session.starred = !session.starred;
    saveSession(session);
  },

  removeSession(id) {
    const index = this.sessions.findIndex((s) => s.id === id);
    if (index < 0) return;
    if (id === this.sessionId) {
      stopStreaming();
      this.sessionId = null;
      this.messages = [];
    }
    this.sessions.splice(index, 1);
    deleteSession(id);
  },
});
