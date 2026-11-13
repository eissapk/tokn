/**
 * Notes about the models you have installed, keyed by their Ollama tag.
 * Models without an entry still work; they show their tag and sort last.
 *
 *   nickname   short name shown in the UI
 *   name       full name shown next to the nickname
 *   uncensored shows an "uncensored" badge
 *   uses       what the model is good at
 *   order      position in the model menu
 */
export const MODEL_NOTES = {
  "hf.co/mradermacher/DeepSeek-V4-Pro-Qwen3.5-9B-UNCENSORED-heretic-GGUF:Q4_K_M": {
    nickname: "deepcoder",
    name: "DeepSeek Heretic 9B",
    uncensored: true,
    uses: ["Coding", "Debugging", "JavaScript", "TypeScript", "Node.js", "Technical problem-solving"],
    order: 1,
  },
  "qwen3.5:9b": {
    nickname: "qwenpro",
    name: "Qwen3.5 9B",
    uses: ["General questions", "Writing", "Brainstorming", "Reasoning", "Explanations", "Research"],
    order: 2,
  },
  "qwen3:8b": {
    nickname: "qwencode",
    name: "Qwen3 8B",
    uses: ["Programming", "Code review", "Debugging", "Technical assistance"],
    order: 3,
  },
  "qwen3:0.6b": {
    nickname: "qwenlite",
    name: "Qwen3 0.6B",
    uses: ["Quick answers", "Classification", "Text formatting", "Lightweight tasks"],
    order: 4,
  },
};
