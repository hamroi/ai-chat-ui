// Zero-dependency local relay for the FirstHam chat UI.
//
// Why this exists: the upstream (freemodel.dev) endpoints do not send CORS headers, so a
// browser cannot call them directly (the preflight is rejected). This relay
// runs locally, serves index.html, and forwards API calls server-side, where
// CORS does not apply. Because the page and the API share the relay's origin,
// the browser makes same-origin requests and never hits CORS at all.
//
// Run:   node proxy.js
// Open:  http://localhost:8787
//
// Uses only Node's built-in modules — no npm install required.

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8787;

// Reuse upstream TLS connections so each message doesn't pay for a fresh
// handshake (a big chunk of time-to-first-token on every send).
const agent = new https.Agent({ keepAlive: true });

// Path prefix -> upstream base URL.
const TARGETS = {
  "/anthropic": "https://cc.freemodel.dev",
  "/openai": "https://api.freemodel.dev",
};

const server = http.createServer((req, res) => {
  // Permissive CORS so the relay also works if the page is opened from another
  // origin. (Same-origin requests don't need this, but it's harmless.)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API proxy ---------------------------------------------------------
  const prefix = Object.keys(TARGETS).find(
    (p) => req.url === p || req.url.startsWith(p + "/")
  );

  if (prefix) {
    // Where to forward: the page can override the upstream via x-upstream-base
    // (so a browser can use ANY platform without hitting CORS — the relay makes
    // the call server-side). Falls back to the built-in target for this prefix.
    const override = req.headers["x-upstream-base"];
    const upstreamBase = (typeof override === "string" && /^https?:\/\//i.test(override))
      ? override.replace(/\/+$/, "")
      : TARGETS[prefix];
    const target = new URL(upstreamBase + req.url.slice(prefix.length));

    // Send tokens to the browser the instant they arrive instead of letting
    // Nagle's algorithm batch the small SSE writes (~40ms stalls per chunk).
    req.socket.setNoDelay(true);

    // Copy the browser's headers (authorization, content-type, …) but rewrite
    // Host and drop origin/referer so the upstream
    // doesn't reject based on them.
    const headers = { ...req.headers, host: target.host };
    delete headers["origin"];
    delete headers["referer"];
    delete headers["x-upstream-base"]; // our control header — don't forward it
    // Ask upstream for an uncompressed stream: gzip/br buffer chunks before
    // flushing, which delays SSE tokens. Identity lets them stream immediately.
    headers["accept-encoding"] = "identity";

    // Pick transport + keep-alive agent by the upstream's protocol (a custom
    // x-upstream-base may be http://, while the built-in targets are https://).
    const isHttps = target.protocol === "https:";
    const transport = isHttps ? https : http;
    const proxyReq = transport.request(
      target,
      { method: req.method, headers, agent: isHttps ? agent : undefined },
      (proxyRes) => {
        // Stream the upstream response straight back (preserves SSE streaming).
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      // If streaming already started we can't send a fresh status line — just end
      // the response. Writing headers twice would crash the whole relay.
      if (res.headersSent) { res.end(); return; }
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Relay error: " + err.message } }));
    });

    req.pipe(proxyReq); // stream the request body upstream
    return;
  }

  // --- Static file: serve the UI ----------------------------------------
  if (req.url === "/" || req.url === "/index.html") {
    fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("index.html not found next to proxy.js");
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`FirstHam is running.`);
  console.log(`  Open:  http://localhost:${PORT}`);
  console.log(`  Relay: /anthropic -> ${TARGETS["/anthropic"]}`);
  console.log(`         /openai    -> ${TARGETS["/openai"]}`);
  console.log(`Press Ctrl+C to stop.`);
});
