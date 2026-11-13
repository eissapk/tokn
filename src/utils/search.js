/**
 * Search across saved chats.
 *
 * Every session is already in memory (chat.sessions), so this is a plain
 * filter -- no index, nothing on disk. A chat matches when every word of the
 * query appears somewhere in it, in any order, ignoring case: "react hook"
 * finds a chat that says "hooks in React".
 *
 * What counts as the text of a chat: its title and each message as the
 * reader saw it -- what was typed for a user turn (not the attached files
 * folded into its content), the answer for an assistant turn (not its
 * thinking).
 */

const words = (query) => String(query || "").toLowerCase().split(/\s+/).filter(Boolean);

const shown = (m) => String((m.role === "user" ? (m.text ?? m.content) : m.content) || "");

/* Lowercasing every chat on every keystroke adds up once replies get long,
   so each chat's text is built once and kept until the chat changes --
   updatedAt moves on every save, which is exactly then. */
const cache = new Map(); // id -> { at, text }
const haystack = (session) => {
  const hit = cache.get(session.id);
  if (hit && hit.at === session.updatedAt) return hit.text;
  const text = [session.title, ...session.messages.map(shown)].join("\n").toLowerCase();
  cache.set(session.id, { at: session.updatedAt, text });
  return text;
};

/** The sessions that match, in the order given. An empty query keeps all. */
export const searchSessions = (sessions, query) => {
  const terms = words(query);
  if (!terms.length) return sessions;
  return sessions.filter((s) => {
    const text = haystack(s);
    return terms.every((t) => text.includes(t));
  });
};

/** A line of context around the first message that matches, for the
    sidebar row. Empty when there's no query, or when the title alone
    already shows why the chat matched. */
export const snippetFor = (session, query) => {
  const terms = words(query);
  if (!terms.length) return "";
  const title = String(session.title).toLowerCase();
  if (terms.every((t) => title.includes(t))) return "";

  for (const m of session.messages) {
    const text = shown(m).replace(/\s+/g, " ");
    const lower = text.toLowerCase();
    const term = terms.find((t) => lower.includes(t));
    if (!term) continue;
    const at = lower.indexOf(term);
    const start = Math.max(0, at - 24);
    const end = at + term.length + 60;
    return (start ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
  }
  return "";
};
