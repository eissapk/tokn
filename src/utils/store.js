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

/* What modelInfo() hands back before any model is known, so the topbar and
   the context meter can read fields off it without guarding every access. */
const NO_MODEL = { name: "", family: "", params: "", quant: "", size: "", context: 0, thinks: false };

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
  },

  /** Replace the installed list, keeping the selection if it's still there. */
  setModels(models) {
    this.models = models;
    if (!models.some((m) => m.name === this.model)) this.model = models.length ? models[0].name : "";
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
