# freemodel.dev Chat

A single-file, dependency-free web UI for chatting with multiple AI models through the
[freemodel.dev](https://freemodel.dev) service, using **your own API key**.

Everything lives in one `index.html` — pure HTML, CSS, and vanilla JavaScript. No build step,
no frameworks, no external libraries.

## Features

- **Two providers**
  - **Anthropic (Claude)** → base endpoint `https://cc.freemodel.dev`
  - **OpenAI** → base endpoint `https://api.freemodel.dev`
- **Model / node selection**
  - Anthropic: `claude-t0` (free), `claude-t1` (requires top-up)
  - OpenAI: `default` (free), `openai-t1-sg`, `openai-t2-sg` (require top-up)
- **Bring your own API key** — stored in the browser's `localStorage`, separately per provider.
- **Streaming chat** via Server-Sent Events for both providers, with a live typing indicator.
- **Chat interface** — clear user vs. assistant bubbles, auto-scroll to the latest message,
  and a loading state while waiting for the model.
- **Persistent history** — your conversation is saved in `localStorage` and restored on refresh.
- **Clear History** button to wipe the conversation.
- **Clear error messages** for common HTTP statuses (401, 403, 429, 500, …).
- **Responsive** layout that works on desktop and mobile.

## Running it

freemodel.dev's endpoints do **not** send CORS headers, so a browser cannot call them
directly — the request is blocked before it's sent. The included `proxy.js` is a tiny,
zero-dependency local relay that solves this: it serves the page **and** forwards API
calls server-side (where CORS doesn't apply). Because the page and the API share the
relay's origin, the browser makes same-origin requests and never hits CORS.

```bash
node proxy.js
```

Then open **http://localhost:8787** in your browser. (Requires Node.js — no `npm install`.)

1. Choose an **API type** (Anthropic or OpenAI) and a **model / node**.
2. Paste your **API key** for that provider.
3. Type a message and press **Enter** (Shift+Enter for a newline) to send.

> Your API key and chat history never leave your machine — they are stored in `localStorage`
> and sent through the local relay straight to freemodel.dev. The relay only forwards; it
> doesn't log or store anything.

### Why not just open `index.html` directly?

You can open the file, but API calls will fail with a "Network error" because the browser's
CORS preflight to freemodel.dev is rejected (HTTP 403, no `Access-Control-Allow-Origin`).
The relay is the practical way to use a browser UI against these endpoints. To point the UI
at a different, CORS-enabled endpoint instead, set each provider's `baseUrl` (top of the
`<script>` in `index.html`) to its full `https://…` URL.

## How the API calls work

### Anthropic
- **Endpoint:** `{BASE_URL}/v1/messages`
- **Headers:** `x-api-key: {API_KEY}`, `anthropic-version: 2023-06-01`
- **Body:** Claude Messages API format — `{ model, max_tokens, stream, messages: [{ role, content }] }`

### OpenAI
- **Endpoint:** `{BASE_URL}/v1/chat/completions`
- **Headers:** `Authorization: Bearer {API_KEY}`
- **Body:** OpenAI Chat Completions format — `{ model, stream, messages: [{ role, content }] }`

The selected **model / node** value (e.g. `claude-t0`, `openai-t1-sg`) is sent as the `model`
field in the request body. When running through `proxy.js`, the UI calls the same-origin paths
`/anthropic/v1/messages` and `/openai/v1/chat/completions`, which the relay forwards to
`cc.freemodel.dev` and `api.freemodel.dev` respectively.

## Notes

- If a server returns a plain (non-streamed) JSON response, the UI automatically falls back to
  rendering the full message.
- The relay streams responses through unbuffered, so Server-Sent Events (token-by-token
  streaming) work end to end.

## License

MIT
