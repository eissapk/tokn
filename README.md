# TOKN

A beautiful, open-source interface for chatting with AI models running on your own machine through [Ollama](https://ollama.com) (`ollama serve`, at http://localhost:11434). Nothing leaves your computer.

Built with [Olum.js](https://olumjs.top/), a minimal JavaScript framework for reactive single-page apps written in plain HTML, CSS and JavaScript.

## How the code is organized

```
src/
├── page.html              the home page (/) — just lays out components/home
├── chat/page.html         the chat app (/chat) + keyboard shortcuts (Ctrl+N, Ctrl+K, Alt+Up/Down)
├── main.css               theme colours and the style of the model's markdown
├── components/
│   ├── Logo.html          the TOKN logo (shared by both pages)
│   ├── home/              one file per home page section (HomeNav, Hero, Showcase, Features…)
│   ├── chat/
│   │   ├── Sidebar.html       logo, new chat, search, saved chats by date, server status, theme
│   │   │   └── SessionItem.html   one saved chat (open / star / delete)
│   │   ├── SearchDialog.html  the chat search palette (search icon or Ctrl+K)
│   │   │   ├── SearchResults.html the chats listed in it
│   │   │   └── SearchResult.html  one chat in it
│   │   ├── Topbar.html        sidebar toggle, context meter (+ logo / new chat when the sidebar is hidden)
│   │   │   └── ContextMeter.html  how full the model's memory is
│   │   ├── Thread.html        the list of messages
│   │   │   ├── Welcome.html       the empty state: prompts to start from, or how to start Ollama
│   │   │   └── ChatMessage.html   one message (with thinking + copy buttons)
│   │   ├── Composer.html      the message box: type, attach files, send / stop, Think toggle
│   │   │   ├── ModelPicker.html   the model menu under the send button
│   │   │   │   └── ModelOption.html   one model in it
│   │   │   └── FileChip.html      one attached file
│   └── ui/                olum-ui components (added with `npx olum add <name>`)
└── utils/
    ├── store.js           ALL app state and actions (send, newChat, openSession…)
    ├── ollama.js          every request to the Ollama server
    ├── models.js          nicknames / notes for your installed models
    ├── sessions.js        saving chats to disk
    ├── search.js          searching inside saved chats + openSearch()
    ├── markdown.js        model output → HTML
    ├── icons.js           the icons the app uses
    └── links.js           outside links (GitHub, docs, Ollama) used on the home page
```

Rule of thumb: **components only draw things and call `chat.something()`; the logic lives in `utils/`.**

## Getting Started

You need [Ollama](https://ollama.com) running with at least one model:

```bash
ollama serve
ollama pull qwen3:0.6b
```

### Installation

Clone the repo and install the project dependencies:

```bash
git clone https://github.com/eissapk/tokn
cd tokn
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at the local URL shown in your terminal.

### Production Build

Create an optimized production build:

```bash
npm run build
```

## Learn Olum.js

If you're new to Olum.js, check out the documentation:

**[Olum.js Documentation →](https://olumjs.top/docs)**

You can also experiment with Olum directly in the browser:

**[Olum.js Playground →](https://olumjs.top/playground)**

## About Olum.js

Olum.js is designed to let you build reactive web applications using familiar HTML, CSS, and JavaScript without requiring a complex toolchain.

If you know HTML, you already know most of what you need to get started with Olum.js.

**[Visit Olum.js →](https://olumjs.top/)**