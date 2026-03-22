#!/usr/bin/env node

/**
 * 간단한 로컬 개발 서버
 * Vercel Serverless Functions를 로컬에서 시뮬레이션
 *
 * Usage: npm run dev → http://localhost:3000
 */

import { createServer } from "http";
import { URL } from "url";

// API 핸들러 임포트
import cardHandler from "../api/card.js";
import badgeHandler from "../api/badge.js";

const PORT = 3000;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");

  // 간단한 req/res 어댑터 (Vercel 형식)
  const vercelReq = { query, method: req.method, url: req.url };
  const vercelRes = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    send(body) {
      this.body = body;
      res.writeHead(this.statusCode, this.headers);
      res.end(body);
    },
    json(data) {
      this.headers["Content-Type"] = "application/json";
      this.send(JSON.stringify(data));
    },
  };

  try {
    if (path === "/api/card") {
      await cardHandler(vercelReq, vercelRes);
    } else if (path === "/api/badge") {
      await badgeHandler(vercelReq, vercelRes);
    } else if (path === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <h2>github-ai-stat dev server</h2>
        <ul>
          <li><a href="/api/card?username=test&theme=dark">/api/card?username=test&theme=dark</a></li>
          <li><a href="/api/badge?tool=claude-code&usage=daily">/api/badge?tool=claude-code</a></li>
          <li><a href="/api/badge?tool=github-copilot&usage=weekly">/api/badge?tool=github-copilot</a></li>
          <li><a href="/api/badge?tool=chatgpt&usage=monthly">/api/badge?tool=chatgpt</a></li>
        </ul>
      `);
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end(`Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log(`  Card:  http://localhost:${PORT}/api/card?username=test&theme=dark`);
  console.log(`  Badge: http://localhost:${PORT}/api/badge?tool=claude-code&usage=daily`);
});
