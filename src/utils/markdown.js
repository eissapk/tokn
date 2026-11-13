/**
 * Turns the model's markdown into HTML: code blocks, headings, lists, quotes,
 * emphasis and links. The whole text is HTML-escaped FIRST, so a model that
 * writes "<script>" shows it as text. Keep that order if you edit this file.
 */

import { Check, Copy } from "./icons.js";

// The icon inside a code block's copy button (ChatMessage swaps it to a check once copied).
const sized = (svg) => svg.replace('height="24"', 'width="13" height="13"');
export const copyFace = (copied) => sized(copied ? Check : Copy);

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

  // Scanned line by line: while a reply streams, a code block's closing ``` may
  // not have arrived yet, and it should still render as code.
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
    // ChatMessage handles clicks on [data-copy] buttons.
    out.push(
      `<div class="code"><div class="code-head"><span>${code.lang}</span>` +
        `<button type="button" class="code-copy" data-copy aria-label="Copy code" title="Copy code">${copyFace(false)}</button></div>` +
        `<pre><code>${code.lines.join("\n")}</code></pre></div>`,
    );
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
