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

/* The picked model survives a reload. Storage can throw in a locked-down
   profile; then the choice just lasts for the session. */
const MODEL_KEY = "Buildr-model";
const readStoredModel = () => {
  try {
    return localStorage.getItem(MODEL_KEY) || "";
  } catch {
    return "";
  }
};
const storeModel = (name) => {
  try {
    localStorage.setItem(MODEL_KEY, name);
  } catch {
    /* ignore */
  }
};

/* What modelInfo() hands back before any model is known, so the topbar and
   the context meter can read fields off it without guarding every access. */
const NO_MODEL = { name: "", label: "", nickname: "", uncensored: false, uses: [], family: "", params: "", quant: "", size: "", context: 0, thinks: false };
export const modelsDic = {
  "hf.co/mradermacher/DeepSeek-V4-Pro-Qwen3.5-9B-UNCENSORED-heretic-GGUF:Q4_K_M": {
    nickname: "deepcoder",
    name: "DeepSeek Heretic 9B",
    uncensored: true,
    uses: ["Coding", "Debugging", "JavaScript", "TypeScript", "Node.js", "Technical problem-solving"],
    order: 1
  },

  "qwen3.5:9b": {
    nickname: "qwenpro",
    name: "Qwen3.5 9B",
    uncensored: false,
    uses: ["General questions", "Writing", "Brainstorming", "Reasoning", "Explanations", "Research"],
    order: 2
  },
  "qwen3:8b": {
    nickname: "qwencode",
    model: "Qwen3 8B",
    name: "Qwen3 8B",
    uncensored: false,
    uses: ["Programming", "Code review", "Debugging", "Technical assistance"],
    order: 3
  },
  "qwen3:0.6b": {
    nickname: "qwenlite",
    name: "Qwen3 0.6B",
    uncensored: false,
    uses: ["Quick answers", "Classification", "Text formatting", "Lightweight tasks"],
    order: 4
  },
};

export const chat = store({
  /* ---- machine ---------------------------------------------------------- */

  /** "connecting" until Topbar's GET /api/tags settles, then "connected" | "offline". */
  server: "connecting",

  /** Filled from GET /api/tags by Topbar -- see toModel() there for the shape. */
  models: [],

  /** API: GET /api/ps -- the models currently held in memory. */
  loaded: [],

  /** The model the composer sends to. Empty until the list arrives. */
  model: "",

  /* ---- the conversation ------------------------------------------------- */

  messages: [],

  /* ---- interface -------------------------------------------------------- */

  theme: "light",

  /* ---- reads ------------------------------------------------------------ */

  modelInfo(name) {
    return this.models.find((m) => m.name === (name || this.model)) || this.models[0] || NO_MODEL;
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
    storeModel(name);
  },

  /** Replace the installed list, keeping the selection if it's still there.
      On first load that's the pick saved in localStorage; if it's no longer
      installed, fall back to the first model. */
  setModels(models) {
    this.models = models;
    const has = (name) => name && models.some((m) => m.name === name);
    if (has(this.model)) return;
    const saved = readStoredModel();
    this.model = has(saved) ? saved : models.length ? models[0].name : "";
  },

  /* ---- conversation actions --------------------------------------------- */

  /** End this thread and start the next one from a clean server.
      /api/chat is stateless -- the context is just the `messages` we send --
      but the server still holds the model with the last thread's KV cache.
      So: stop any reply still streaming, drop the transcript, unload the
      model (keep_alive: 0 frees its cache), then load it again empty so the
      first message of the new chat doesn't pay the load time. */
  async clear() {
    // Already a fresh chat (e.g. Ctrl+N on an empty window): nothing to reset.
    if (!this.messages.length) return;
    abortRequest();
    this.messages = [];

    const model = this.model;
    if (!model) return;
    const post = (body) =>
      fetch(`${Buildr_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [], ...body }),
      });
    try {
      await post({ keep_alive: 0 });
      await post({});
    } catch (err) {
      console.error("Failed to reset the model:", err.message);
    }
  },
});

/* -------------------------------------------------------------------------- */
/* In-flight request                                                          */
/* -------------------------------------------------------------------------- */

/* The AbortController for the /api/chat reply that is streaming, if any.
   It lives here rather than in Composer so New chat can stop it too. It's a
   handle, not something the view renders, so it stays out of the store. */
let controller = null;

/** Start a request; returns the signal to hand to fetch. */
export const beginRequest = () => {
  controller = new AbortController();
  return controller.signal;
};

export const endRequest = () => {
  controller = null;
};

/* Aborting the fetch also cancels the body stream, so the server sees the
   connection close and stops generating. */
export const abortRequest = () => controller && controller.abort();

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
