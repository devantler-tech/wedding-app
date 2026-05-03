import { describe, it, expect } from "vitest";
import { getWeddingInfo, getRsvpStatus, handleRequest } from "./index.js";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

describe("getWeddingInfo", () => {
  it("returns default wedding info", () => {
    const info = getWeddingInfo();
    expect(info.couple).toBe("Partner A & Partner B");
    expect(info.date).toBe("2026-09-01");
    expect(info.venue).toBe("TBD");
    expect(info.message).toBe("We're getting married!");
  });
});

describe("getRsvpStatus", () => {
  it("returns open status", () => {
    const rsvp = getRsvpStatus();
    expect(rsvp.status).toBe("open");
  });
});

function createMockReqRes(url: string): {
  req: IncomingMessage;
  res: ServerResponse & { body: string; statusCode: number };
} {
  const socket = new Socket();
  const req = new IncomingMessage(socket);
  req.url = url;
  req.method = "GET";

  const res = new ServerResponse(req) as ServerResponse & {
    body: string;
    statusCode: number;
  };
  let body = "";

  const originalEnd = res.end.bind(res);
  res.end = ((chunk?: unknown, ...args: unknown[]) => {
    if (typeof chunk === "string") body += chunk;
    if (Buffer.isBuffer(chunk)) body += chunk.toString();
    res.body = body;
    return originalEnd(chunk as string, ...(args as [BufferEncoding, (() => void)?]));
  }) as typeof res.end;

  return { req, res };
}

describe("handleRequest", () => {
  it("GET / returns health check", () => {
    const { req, res } = createMockReqRes("/");
    handleRequest(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });

  it("GET /info returns wedding info", () => {
    const { req, res } = createMockReqRes("/info");
    handleRequest(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("couple");
    expect(body).toHaveProperty("date");
  });

  it("GET /rsvp returns rsvp status", () => {
    const { req, res } = createMockReqRes("/rsvp");
    handleRequest(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveProperty("status", "open");
  });

  it("GET /unknown returns 404", () => {
    const { req, res } = createMockReqRes("/unknown");
    handleRequest(req, res);
    expect(res.statusCode).toBe(404);
  });
});
