# lc-ts

LangChain.js examples in TypeScript.

## Stack

- [LangChain.js](https://js.langchain.com/) v1 — chains, agents, tool calling
- [LangGraph](https://langchain-ai.github.io/langgraphjs/) — stateful agent workflows with checkpointing
- [OpenAI](https://platform.openai.com/) — chat model + embeddings
- [Zod](https://zod.dev/) — schema validation
- [dotenv](https://github.com/motdotla/dotenv) — environment variables
- [tsx](https://github.com/privatenumber/tsx) — zero-config TypeScript runner

## Setup

```bash
# 1. Copy env and add your key
cp .env.example .env

# 2. Fill OPENAI_API_KEY in .env

# 3. Install dependencies
bun install   # or: npm install
```

## Run

```bash
bun run email-agent    # or: npm run email-agent
```

## Project layout

```
lc-ts/
├── examples/
│   └── email_agent.ts   # HITL auth agent — LangGraph + human-in-the-loop
├── lib/
│   └── log.ts           # Colored console logger (user / assistant / interrupt / decision / invoke)
├── .env                 # Your secrets (gitignored)
├── .env.example         # Template — copy to .env
└── package.json
```

## email_agent

An agent that authenticates a user via email + password using LangGraph's `humanInTheLoopMiddleware`. The agent:

1. Accepts email + password credentials
2. Calls the `authTool` which validates against hardcoded test credentials (`julie@example.com` / `password123`)
3. Uses `MemorySaver` checkpointing to persist state across turns
4. Runs with a fixed `threadId` so you can resume the same conversation

The `lib/log.ts` helper emits colored console output for each agent step (`user`, `assistant`, `invoke`, `interrupt`, `decision`).
