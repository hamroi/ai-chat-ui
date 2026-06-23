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

## Usage

1. Open `index.html` in any modern browser (just double-click it, or serve the folder).
2. Choose an **API type** (Anthropic or OpenAI) and a **model / node**.
3. Paste your **API key** for that provider.
4. Type a message and press **Enter** (Shift+Enter for a newline) to send.

> Your API key and chat history never leave your browser — they are only stored in `localStorage`
> and sent directly to the selected freemodel.dev endpoint.

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
field in the request body.

## Notes

- The browser calls the freemodel.dev endpoints directly via `fetch`, so those endpoints must
  permit cross-origin (CORS) requests from the page's origin. If you see a "Network error",
  it is usually a CORS or connectivity issue rather than a bug in the UI.
- If a server returns a plain (non-streamed) JSON response, the UI automatically falls back to
  rendering the full message.

## License

MIT
