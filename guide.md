╔════════════════════════════════════════════════════════════╗
║              QWEN3 8B + OLLAMA CHEAT SHEET                ║
╚════════════════════════════════════════════════════════════╝


START OLLAMA SERVER
────────────────────────────────────────────────────────────

ollama serve

Starts the Ollama server/API.

Default API:
    http://localhost:11434


CHECK OLLAMA VERSION
────────────────────────────────────────────────────────────

ollama --version


LIST INSTALLED MODELS
────────────────────────────────────────────────────────────

ollama list

Shows downloaded/created models.


LIST RUNNING MODELS
────────────────────────────────────────────────────────────

ollama ps

Shows models currently loaded/running.


DOWNLOAD QWEN3 8B
────────────────────────────────────────────────────────────

ollama pull qwen3:8b


START QWEN3 8B
────────────────────────────────────────────────────────────

ollama run qwen3:8b


FIRST-TIME CONFIGURATION
────────────────────────────────────────────────────────────

/set parameter num_ctx 8192
/set parameter num_predict 4096


SAVE CONFIGURED MODEL
────────────────────────────────────────────────────────────

/save qwen3-dev


START SAVED MODEL
────────────────────────────────────────────────────────────

ollama run qwen3-dev


NORMAL MODE
────────────────────────────────────────────────────────────

/set nothink

Use for:
  • Everyday coding
  • Next.js / React
  • Strapi
  • JavaScript / TypeScript
  • Python
  • C++ / Arduino
  • Blogs / content
  • Simple debugging


THINKING MODE
────────────────────────────────────────────────────────────

/set think

Use for:
  • Difficult debugging
  • Complex reasoning
  • Architecture
  • Algorithms
  • Hard programming problems


STOP CURRENT RESPONSE
────────────────────────────────────────────────────────────

Ctrl+C

Stops the current generation.


CLEAR PREVIOUS CONVERSATION
────────────────────────────────────────────────────────────

/clear

Clears the current conversation context.


START A COMPLETELY NEW QUESTION
────────────────────────────────────────────────────────────

If Qwen is generating an answer you don't want:

    Ctrl+C
    /clear
    New question

IMPORTANT:

    Ctrl+C  = Stop generation
    /clear   = Clear conversation context


EXAMPLE
────────────────────────────────────────────────────────────

>>> Explain React Server Components

Thinking...
...
...
^C

>>> /clear

>>> Explain Strapi relations


HELP
────────────────────────────────────────────────────────────

/help


EXIT QWEN SESSION
────────────────────────────────────────────────────────────

/bye


INSPECT MODEL
────────────────────────────────────────────────────────────

ollama show qwen3-dev


INSPECT MODELFILE
────────────────────────────────────────────────────────────

ollama show --modelfile qwen3-dev


DELETE MODEL
────────────────────────────────────────────────────────────

ollama rm qwen3-dev


OLLAMA API
────────────────────────────────────────────────────────────

http://localhost:11434


CHECK API
────────────────────────────────────────────────────────────

curl http://localhost:11434/api/tags


JAVASCRIPT CHAT API
────────────────────────────────────────────────────────────

const response = await fetch(
  "http://localhost:11434/api/chat",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen3-dev",
      messages: [
        {
          role: "user",
          content: "Explain React Server Components."
        }
      ],
      stream: false
    })
  }
);

const data = await response.json();

console.log(data.message.content);


PYTHON INSTALLATION
────────────────────────────────────────────────────────────

pip install ollama


PYTHON CHAT API
────────────────────────────────────────────────────────────

from ollama import chat

response = chat(
    model="qwen3-dev",
    messages=[
        {
            "role": "user",
            "content": "Explain how Strapi relations work."
        }
    ],
)

print(response.message.content)


GPU MONITORING
────────────────────────────────────────────────────────────

watch -n 1 nvidia-smi


ONE-TIME GPU CHECK
────────────────────────────────────────────────────────────

nvidia-smi


CONTEXT RECOMMENDATION
────────────────────────────────────────────────────────────

8K
  ↓
Recommended starting point for your 16 GB RAM machine

16K
  ↓
Try later if memory/performance are good

128K
  ↓
Don't start here initially


DAILY WORKFLOW
────────────────────────────────────────────────────────────

Terminal 1:
    ollama serve

Terminal 2:
    ollama run qwen3-dev

        ↓

    /set nothink

        ↓

    Everyday coding/content

        ↓

    Difficult problem?
        │
        └── /set think

        ↓

    New unrelated task?
        │
        ├── Ctrl+C
        ├── /clear
        └── New question


API WORKFLOW
────────────────────────────────────────────────────────────

Your App
   │
   ▼
http://localhost:11434
   │
   ▼
Ollama Server
   │
   ▼
qwen3-dev
   │
   ▼
Response


MODEL FLOW
────────────────────────────────────────────────────────────

qwen3:8b
    │
    ├── num_ctx 8192
    ├── num_predict 4096
    │
    ▼
/save qwen3-dev
    │
    ▼
ollama run qwen3-dev
    │
    ├── /set nothink
    │       └── Everyday work
    │
    └── /set think
            └── Difficult reasoning


GOLDEN RULE
────────────────────────────────────────────────────────────

STOP + FORGET + START NEW:

    Ctrl+C
    /clear
    New question

