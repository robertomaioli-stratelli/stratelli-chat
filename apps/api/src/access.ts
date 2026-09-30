import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { demoEnabled } from "./demo";
export function homologEnabled(env: NodeJS.ProcessEnv) {
  return (
    env.APP_ENV === "homolog" &&
    env.CHAT_DEMO === "true" &&
    !!env.CHAT_BASIC_USER &&
    (env.CHAT_BASIC_PASSWORD?.length || 0) >= 16
  );
}
export function sameSecret(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
export function access(env: NodeJS.ProcessEnv) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/api/chat/health") return next();
    if (demoEnabled(env)) return next();
    if (!homologEnabled(env))
      return res.status(503).json({ message: "Acesso em preparação." });
    const header = req.get("authorization") || "";
    const credentials = header.startsWith("Basic ")
      ? Buffer.from(header.slice(6), "base64").toString("utf8")
      : "";
    const index = credentials.indexOf(":");
    if (
      index < 0 ||
      !sameSecret(credentials.slice(0, index), env.CHAT_BASIC_USER!) ||
      !sameSecret(credentials.slice(index + 1), env.CHAT_BASIC_PASSWORD!)
    ) {
      res.setHeader(
        "WWW-Authenticate",
        'Basic realm="Chat homologacao", charset="UTF-8"',
      );
      return res.status(401).json({ message: "Autenticação necessária." });
    }
    // Temporary homologation account; never panel identity or client-supplied city.
    next();
  };
}
