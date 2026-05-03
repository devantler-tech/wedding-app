import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = Number(process.env.PORT) || 3000;

export interface WeddingInfo {
  couple: string;
  date: string;
  venue: string;
  message: string;
}

export function getWeddingInfo(): WeddingInfo {
  return {
    couple: process.env.COUPLE_NAMES || "Partner A & Partner B",
    date: process.env.WEDDING_DATE || "2026-09-01",
    venue: process.env.WEDDING_VENUE || "TBD",
    message: process.env.WEDDING_MESSAGE || "We're getting married!",
  };
}

export interface RsvpResponse {
  status: string;
  message: string;
}

export function getRsvpStatus(): RsvpResponse {
  return {
    status: "open",
    message: "RSVP endpoint — POST support coming soon.",
  };
}

export function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? "/";

  res.setHeader("Content-Type", "application/json");

  switch (url) {
    case "/":
      res.writeHead(200);
      res.end(JSON.stringify({ status: "ok" }));
      break;
    case "/info":
      res.writeHead(200);
      res.end(JSON.stringify(getWeddingInfo()));
      break;
    case "/rsvp":
      res.writeHead(200);
      res.end(JSON.stringify(getRsvpStatus()));
      break;
    default:
      res.writeHead(404);
      res.end(JSON.stringify({ error: "not found" }));
  }
}

const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Wedding API listening on port ${PORT}`);
});
