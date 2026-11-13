/**
 * Search saved chats. A chat matches when every word of the query appears
 * somewhere in its title or messages, in any order, ignoring case.
 */

const words = (query) => String(query || "").toLowerCase().split(/\s+/).filter(Boolean);

const shown = (m) => String((m.role === "user" ? (m.text ?? m.content) : m.content) || "");

// Each chat's lowercased text is cached until the chat changes (its updatedAt moves).
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

/** A short excerpt around the first match, or "" when the title already shows the match. */
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
