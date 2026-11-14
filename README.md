# Buildr

A web application built with [Olum.js](https://olumjs.top/), a minimal JavaScript framework for building reactive single-page applications with HTML, CSS, and JavaScript.

A chat app for AI models running on your own machine through [Ollama](https://ollama.com) (`ollama serve`, at http://localhost:11434).

## How the code is organized

```
src/
├── page.html              the app layout + keyboard shortcuts (Ctrl+N, Ctrl+K, Alt+Up/Down)
├── main.css               theme colours and the style of the model's markdown
├── components/
│   ├── Sidebar.html       saved chats + search icon
│   │   └── SessionItem.html   one saved chat (open / star / delete)
│   ├── SearchDialog.html  the chat search palette (search icon or Ctrl+K)
│   │   ├── SearchResults.html the chats listed in it
│   │   └── SearchResult.html  one chat in it
│   ├── Topbar.html        model picker, context meter, new chat, theme
│   │   ├── ModelOption.html   one model in the picker
│   │   └── ContextMeter.html  how full the model's memory is
│   ├── Thread.html        the list of messages
│   │   └── ChatMessage.html   one message (with thinking + copy buttons)
│   ├── Composer.html      the message box: type, attach files, send / stop
│   ├── FileChip.html      one attached file
│   └── ui/                olum-ui components (added with `npx olum add <name>`)
└── utils/
    ├── store.js           ALL app state and actions (send, newChat, openSession…)
    ├── ollama.js          every request to the Ollama server
    ├── models.js          nicknames / notes for your installed models
    ├── sessions.js        saving chats to disk
    ├── search.js          searching inside saved chats + openSearch()
    ├── markdown.js        model output → HTML
    └── icons.js           the icons the app uses
```

Rule of thumb: **components only draw things and call `chat.something()`; the logic lives in `utils/`.**

## Getting Started

### Installation

Install the project dependencies:

```bash
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