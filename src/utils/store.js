import { store } from "olum";

/**
 * Everything the UI reads.
 *
 * One conversation, held in memory, gone when the window closes. Components
 * read this store; the composer's controls are stubs in Composer.html, so
 * wiring the real thing means filling those in and pushing turns onto
 * `messages` ({ id, role: "user" | "assistant", content }).
 *
 * Buildr listens on http://localhost:11434 by default.
 */

export const Buildr_HOST = "http://localhost:11434";

/* Rough enough for a context meter: Buildr reports real counts in the /api/chat
   response (prompt_eval_count + eval_count), so this only has to hold until
   the first reply arrives. */
const estimateTokens = (text) => Math.ceil(String(text || "").length / 4);

/* Placeholder transcript so the chat body has something to show. Delete it
   (and point `messages` back at []) once real turns are being pushed. */
const DUMMY_MESSAGES = [
  { id: "d1", role: "user", content: "What does num_ctx change, and when is it worth raising?" },
  {
    id: "d2",
    role: "assistant",
    content: `**num_ctx** sets the context window: how many tokens the model can hold at once -- your prompt, the conversation so far, and the answer it's writing, all counted together.

You can raise it for a session:

\`\`\`bash
ollama run qwen3:8b
/set parameter num_ctx 8192
\`\`\`

A larger window costs memory and slows the first token, so raise it when a task needs the history, not by default.`,
  },
  { id: "d3", role: "user", content: "Q4_K_M or Q5_K_M on a machine with 16 GB of RAM?" },
  {
    id: "d4",
    role: "assistant",
    content: `For an 8B model, either fits comfortably in 16 GB.

- **Q4_K_M** -- about 5 GB, faster, the usual default.
- **Q5_K_M** -- about 6 GB, slightly better output, a little slower.

Start with Q4_K_M and only move up if you notice the quality gap on your own prompts.`,
  },
];

export const chat = store({
  /* ---- machine ---------------------------------------------------------- */

  /** API: GET /api/version -- "connected" | "connecting" | "offline". */
  server: "connected",

  /** API: GET /api/tags. `size` is bytes in the real payload; pre-formatted here. */
  models: [
    { name: "qwen3:8b", family: "Qwen3", params: "8B", quant: "Q4_K_M", size: "5.2 GB", context: 32768, thinks: true },
    { name: "llama3.2:3b", family: "Llama 3.2", params: "3B", quant: "Q4_K_M", size: "2.0 GB", context: 131072, thinks: false },
    { name: "deepseek-r1:7b", family: "DeepSeek R1", params: "7B", quant: "Q4_K_M", size: "4.7 GB", context: 32768, thinks: true },
    { name: "gemma3:4b", family: "Gemma 3", params: "4B", quant: "Q4_K_M", size: "3.3 GB", context: 8192, thinks: false },
    { name: "codellama:13b", family: "Code Llama", params: "13B", quant: "Q4_0", size: "7.4 GB", context: 16384, thinks: false },
  ],

  /** API: GET /api/ps -- the models currently held in memory. */
  loaded: ["qwen3:8b"],

  model: "qwen3:8b",

  /* ---- the conversation ------------------------------------------------- */

  messages: DUMMY_MESSAGES,

  /* ---- interface -------------------------------------------------------- */

  theme: "light",

  /* ---- reads ------------------------------------------------------------ */

  modelInfo(name) {
    return this.models.find((m) => m.name === (name || this.model)) || this.models[0];
  },

  isLoaded(name) {
    return this.loaded.includes(name);
  },

  /** Tokens the next turn would carry, against the active model's window. */
  contextUsed() {
    return this.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  },

  contextLimit() {
    return this.modelInfo().context;
  },

  /* ---- interface actions ------------------------------------------------ */

  toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    applyTheme(this.theme);
  },

  setModel(name) {
    this.model = name;
  },

  /* ---- conversation actions --------------------------------------------- */

  /** End this thread. Nothing is kept, so there is nothing to file away. */
  clear() {
    this.messages = [];
  },
});

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

/** olum-ui keys its dark palette off `.dark`, so the toggle is one class on <html>. */
export const applyTheme = (theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("Buildr-theme", theme);
  } catch {
    /* a locked-down profile just gets the default next launch */
  }
};

export const restoreTheme = () => {
  let stored = null;
  try {
    stored = localStorage.getItem("Buildr-theme");
  } catch {
    /* ignore */
  }
  const theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  chat.theme = theme;
  applyTheme(theme);
};
