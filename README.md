# Buildr

A web application built with [Olum.js](https://olumjs.top/), a minimal JavaScript framework for building reactive single-page applications with HTML, CSS, and JavaScript.

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


### todos:
- use node in nwjs to store each conversation as json file with chat id so we can retrieve later old chats
- fix think mode, it does't work, it says think is enabled if clicked or unclicked
- add search functgioality betwwen chats
- when clicing new change send request to ollama server to close old chat and create new one so wipe out the context window
- use browser api to reach attached files content
- add cp to clipboard button for code blocks in response
- add title to models, for coding, for planing, images, articles, quick answers,etc
