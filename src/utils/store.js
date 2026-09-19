import { store } from "olum";

/**
 * Everything the UI reads.
 *
 * One conversation, held in memory, gone when the window closes. There is no
 * history, no persistence and no session list: the app opens empty every time
 * and `clear()` is the only way to end a thread.
 *
 * This is a front end against a fake Buildr. Each place that would talk to the
 * daemon is marked `API:` with the endpoint that belongs there, and nothing
 * else in the app knows where the data comes from -- components read this
 * store and call these methods, so wiring the real thing means replacing the
 * bodies below and deleting the stand-in generator at the bottom.
 *
 * Buildr listens on http://localhost:11434 by default.
 */

export const Buildr_HOST = "http://localhost:11434";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

/* Rough enough for a context meter: Buildr reports real counts in the /api/chat
   response (prompt_eval_count + eval_count), so this only has to hold until
   the first reply arrives. */
const estimateTokens = (text) => Math.ceil(String(text || "").length / 4);

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

  messages: [],

  /* ---- interface -------------------------------------------------------- */

  theme: "light",
  draft: "",
  think: false,
  listening: false,
  streaming: false,

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

  toggleThink() {
    this.think = !this.think;
  },

  /**
   * API: start/stop dictation -- SpeechRecognition in the browser, or pipe the
   * recording to a local whisper model. Write partial results into `draft` as
   * they arrive and the field fills in as the user speaks.
   */
  toggleMic() {
    this.listening = !this.listening;
  },

  setDraft(value) {
    this.draft = value;
  },

  setModel(name) {
    this.model = name;
  },

  /* ---- conversation actions --------------------------------------------- */

  /** End this thread. Nothing is kept, so there is nothing to file away. */
  clear() {
    this.stop();
    this.messages = [];
    this.draft = "";
  },

  send() {
    const text = this.draft.trim();
    if (!text || this.streaming) return;

    this.messages.push({ id: uid(), role: "user", content: text, at: now() });
    this.draft = "";
    this.reply();
  },

  /** Ask the active model for the next turn. */
  reply() {
    this.messages.push({ id: uid(), role: "assistant", content: "", model: this.model, at: now(), tokens: 0, tps: 0, elapsed: 0 });
    this.streaming = true;

    // Read the pushed turn back OUT of the store. The object handed to push()
    // is the plain one we just built; the store wraps it on the way in, and
    // only writes through that wrapper are seen. Mutating the original would
    // fill in the text with nothing re-rendering, and the whole answer would
    // appear in one jump when the next real store write happened to land.
    const message = this.messages[this.messages.length - 1];

    // API: POST /api/chat { model, messages, stream: true, think } and append
    // each chunk's message.content to `message.content` as it arrives -- the
    // transcript re-renders on every write, so streaming needs no other
    // plumbing. The final chunk carries eval_count / eval_duration, which is
    // where `tokens` and `tps` come from.
    startFakeStream(message, () => {
      this.streaming = false;
      if (!this.loaded.includes(message.model)) this.loaded = [...this.loaded, message.model];
    });
  },

  /** API: abort the fetch -- Buildr stops generating when the response body is cancelled. */
  stop() {
    stopFakeStream();
    this.streaming = false;
  },

  /** Drop the last answer and ask again. */
  regenerate() {
    if (this.streaming || !this.messages.length) return;
    const last = this.messages[this.messages.length - 1];
    if (last.role === "assistant") this.messages.pop();
    this.reply();
  },

  /** Rewind to a user turn and put it back in the field. */
  editFrom(id) {
    const index = this.messages.findIndex((m) => m.id === id);
    if (index < 0) return;
    this.stop();
    this.draft = this.messages[index].content;
    this.messages = this.messages.slice(0, index);
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

/* -------------------------------------------------------------------------- */
/* Stand-in generator                                                         */
/*                                                                            */
/* Delete this whole section once /api/chat is wired. It exists so the UI can  */
/* be judged with tokens actually arriving -- the caret, the stop button, the  */
/* autoscroll and the tok/s readout all behave the way they will in the real   */
/* app.                                                                       */
/* -------------------------------------------------------------------------- */

let timer = null;

const CANNED = [
  `Rebasing rewrites the commits on your branch so they sit on top of another branch, which gives you a straight line of history instead of a merge bubble.

### Move your branch onto main

\`\`\`bash
git switch feature-branch
git fetch origin
git rebase origin/main
\`\`\`

If a commit conflicts, git stops and waits. Fix the files, stage them, and carry on:

\`\`\`bash
git add path/to/file
git rebase --continue
\`\`\`

### Tidy the commits themselves

\`\`\`bash
git rebase -i HEAD~5
\`\`\`

Each line in the editor is a commit. Change \`pick\` to \`squash\` to fold one into the line above it, \`reword\` to rewrite its message, or delete the line to drop the commit entirely.

### Push the rewritten branch

Because the commits now have new hashes, a plain push is rejected:

\`\`\`bash
git push --force-with-lease
\`\`\`

\`--force-with-lease\` refuses the push if someone else has added commits since you last fetched, which \`--force\` would happily throw away.

> Rebase branches you own. Once others have pulled a branch, rewriting it rewrites their history too.`,

  `Here's the shape of it.

A **context window** is how many tokens the model can hold at once — your prompt, the conversation so far, and the answer it's writing, all counted together. When a chat outgrows the window, the oldest turns fall out of it.

\`\`\`bash
Buildr show qwen3:8b --modelfile | grep num_ctx
\`\`\`

You can raise it per session:

\`\`\`bash
Buildr run qwen3:8b
/set parameter num_ctx 8192
\`\`\`

A larger window costs memory and slows the first token, so raise it when a task needs the history, not by default.`,
];

let next = 0;

const startFakeStream = (message, done) => {
  stopFakeStream();

  const text = CANNED[next++ % CANNED.length];
  const chunks = text.match(/\S+\s*/g) || [];
  const started = performance.now();
  let i = 0;

  timer = setInterval(() => {
    if (i >= chunks.length) {
      stopFakeStream();
      done();
      return;
    }
    message.content += chunks[i++];
    message.tokens = Math.round(i * 1.35);
    message.elapsed = (performance.now() - started) / 1000;
    message.tps = message.elapsed > 0 ? message.tokens / message.elapsed : 0;
  }, 26);
};

const stopFakeStream = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
