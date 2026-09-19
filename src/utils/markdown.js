/**
 * A small markdown renderer for model output.
 *
 * Ollama streams markdown, so something has to turn it into HTML before it
 * reaches html="". This covers what a chat model actually emits -- fenced
 * code, headings, lists, emphasis, quotes, links -- and nothing else. Swap it
 * for marked/markdown-it when the transcript needs tables or footnotes; the
 * only contract the UI depends on is `render(text) -> html string`.
 *
 * Everything is escaped BEFORE any tag is produced, so a model that echoes
 * "<script>" back at you renders it as text. Keep that order if you edit this:
 * html="" does not escape, and this function is the only thing standing
 * between the transcript and the DOM.
 */

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Inline marks, applied to already-escaped text. Code first, so `**x**` inside backticks stays literal. */
const inline = (text) =>
  text
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\W)\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');

/** Block-level pass over one run of non-code lines. */
const blocks = (src) => {
  const out = [];
  const lines = src.split("\n");
  let list = null; // { tag, items: [] }

  const closeList = () => {
    if (!list) return;
    out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join("")}</${list.tag}>`);
    list = null;
  };

  const openList = (tag, item) => {
    if (list && list.tag !== tag) closeList();
    if (!list) list = { tag, items: [] };
    list.items.push(inline(item));
  };

  for (const line of lines) {
    const text = line.trim();

    if (!text) {
      closeList();
      continue;
    }

    const heading = text.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) {
      closeList();
      out.push("<hr />");
      continue;
    }

    // &gt; because escaping runs before this pass -- see render().
    const quote = text.match(/^(?:>|&gt;)\s?(.*)$/);
    if (quote) {
      closeList();
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    const bullet = text.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      openList("ul", bullet[1]);
      continue;
    }

    const numbered = text.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      openList("ol", numbered[1]);
      continue;
    }

    closeList();
    out.push(`<p>${inline(text)}</p>`);
  }

  closeList();
  return out.join("");
};

export const render = (markdown) => {
  if (!markdown) return "";

  // Fences are found by scanning lines, not by one clever regex: a response is
  // rendered on every chunk while it streams, so the common case is a block
  // whose closing fence has not arrived yet. An unterminated fence runs to the
  // end of the text and still renders as code.
  const lines = escapeHtml(markdown).split("\n");
  const out = [];
  let prose = [];
  let code = null; // { lang, lines: [] }

  const flushProse = () => {
    if (prose.length) out.push(blocks(prose.join("\n")));
    prose = [];
  };

  const flushCode = () => {
    if (!code) return;
    out.push(`<div class="code"><div class="code-lang">${code.lang}</div><pre><code>${code.lines.join("\n")}</code></pre></div>`);
    code = null;
  };

  for (const line of lines) {
    const fence = line.match(/^\s*```([\w+-]*)\s*$/);

    if (fence && !code) {
      flushProse();
      code = { lang: fence[1] || "text", lines: [] };
    } else if (fence) {
      flushCode();
    } else if (code) {
      code.lines.push(line);
    } else {
      prose.push(line);
    }
  }

  flushProse();
  flushCode();
  return out.join("");
};
