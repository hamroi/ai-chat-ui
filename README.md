#  FirstHam

A colorful, single-page web UI for chatting with multiple AI models using **your own API key**.
The UI itself is one dependency-free `index.html` (pure HTML/CSS/vanilla JS); a tiny bundled
relay (`proxy.js`) handles the network so the browser can reach the providers.

## Features

- **Two providers**
  - **Anthropic (Claude)** — relayed to `https://cc.freemodel.dev`
  - **OpenAI** — relayed to `https://api.freemodel.dev`
- **Model / node selection** with a built-in tier list, plus a **“Show all”** button that fetches
  every available model from the provider's `/v1/models` endpoint.
  - Anthropic: `claude-t0` (free), `claude-t1` (requires top-up)
  - OpenAI: `default` (free), `openai-t1-sg`, `openai-t2-sg` (require top-up)
- **API key management** — **Save** and **Delete** buttons, a show/hide toggle, stored per
  provider in `localStorage`.
- **File & image attachments** — attach images, PDFs, and text files with the 📎 button.
  Images render as thumbnails; everything is sent in the correct format per provider.
- **Streaming chat** via Server-Sent Events for both providers, with a live typing indicator.
- **Persistent history** — your conversation is saved in `localStorage` and restored on refresh.
- **Clear History** button.
- **Clear error messages** for common HTTP statuses (401, 403, 429, 500, …).
- **Colorful, responsive** layout that works on desktop and mobile.

## Running it

The upstream endpoints do **not** send CORS headers, so a browser can't call them directly.
The included `proxy.js` is a tiny, zero-dependency local relay that serves the page **and**
forwards API calls server-side (where CORS doesn't apply). Because the page and the API share
the relay's origin, the browser makes same-origin requests and never hits CORS.

```bash
node proxy.js
```

Then open **http://localhost:8787** in your browser. (Requires Node.js — no `npm install`.)

1. Choose an **API type** (Anthropic or OpenAI) and a **model / node** (or click **Show all**).
2. Paste your **API key** and click **Save**.
3. Optionally attach files/images with 📎.
4. Type a message and press **Enter** (Shift+Enter for a newline) to send.

> Your API key and chat history never leave your machine — they're stored in `localStorage`
> and sent through the local relay straight to the provider. The relay only forwards; it
> doesn't log or store anything.

### Why not just open `index.html` directly?

You can, but API calls will fail with a "Network error" because the browser's CORS preflight
to the upstream is rejected (HTTP 403, no `Access-Control-Allow-Origin`). The relay is the
practical way to use a browser UI against these endpoints. To point the UI at a different,
CORS-enabled endpoint, set each provider's `baseUrl` (top of the `<script>` in `index.html`)
to its full `https://…` URL.

## How the API calls work

When running through `proxy.js`, the UI calls same-origin paths that the relay forwards:

### Anthropic
- **Endpoint:** `/anthropic/v1/messages` → `https://cc.freemodel.dev/v1/messages`
- **Headers:** `x-api-key: {API_KEY}`, `anthropic-version: 2023-06-01`
- **Body:** Claude Messages format — `{ model, max_tokens, stream, messages: [...] }`
- **Attachments:** images as `image` blocks, PDFs as `document` blocks, text files inlined as text.

### OpenAI
- **Endpoint:** `/openai/v1/chat/completions` → `https://api.freemodel.dev/v1/chat/completions`
- **Headers:** `Authorization: Bearer {API_KEY}`
- **Body:** OpenAI Chat Completions format — `{ model, stream, messages: [...] }`
- **Attachments:** images as `image_url` parts, PDFs as `file` parts, text files inlined as text.

The selected **model / node** value (e.g. `claude-t0`, `openai-t1-sg`) is sent as the `model`
field in the request body.

## Notes

- If a server returns a plain (non-streamed) JSON response, the UI automatically falls back to
  rendering the full message.
- The relay streams responses through unbuffered, so token-by-token streaming works end to end.
- Attachment support depends on the underlying model — vision models handle images; PDF support
  varies. Large attachments may exceed `localStorage` quota, in which case the UI keeps the text
  of your history and drops the saved attachment data (the current session still works fully).

## License

MIT
