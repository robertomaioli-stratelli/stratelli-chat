import "reflect-metadata";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import express from "express";
import { resolve } from "node:path";
import { dataSource } from "./database/source";
import { History } from "./database/history";
import { answerDemo } from "./demo";
import { access, homologEnabled } from "./access";

import { loadSecrets } from "./secrets";

const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
function record(body: unknown, keys: string[]): Record<string, unknown> {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !keys.includes(k))
  )
    throw new BadRequestException("Formato inválido.");
  return body as Record<string, unknown>;
}
export async function createApp() {
  loadSecrets(process.env);
  const db = dataSource();
  await db.initialize();
  const history = new History(db);
  const scope = {
    userId: homologEnabled(process.env)
      ? `homolog:${process.env.CHAT_BASIC_USER}`
      : "local-demo",
    cityId: "4115200",
  };
  @Controller("api/chat")
  class ChatController {
    @Get("health") health() {
      return { status: "ok" };
    }
    @Get("ready") async ready() {
      try {
        await db.query("SELECT id FROM chat_conversations LIMIT 0");
        return { status: "ok", database: "ok" };
      } catch {
        throw new ServiceUnavailableException("Banco próprio indisponível.");
      }
    }
    @Get("session") session() {
      return {
        demo: true,
        user: { id: scope.userId, name: "Conta de teste" },
        city: { id: scope.cityId, name: "Maringá" },
      };
    }
    @Get("conversations") list() {
      return history.list(scope);
    }
    @Get("conversations/:id/messages") messages(@Param("id") id: string) {
      if (!uuid(id)) throw new BadRequestException();
      return history.messages(scope, id);
    }
    @Post("messages") async message(@Body() input: unknown) {
      const body = record(input, ["question", "conversationId", "messageId"]);
      if (
        typeof body.question !== "string" ||
        !body.question.trim() ||
        body.question.length > 2000 ||
        !uuid(body.conversationId) ||
        !uuid(body.messageId)
      )
        throw new BadRequestException(
          "Envie uma pergunta de até 2.000 caracteres e identificadores válidos.",
        );
      const start = Date.now(),
        question = body.question.trim();
      const answer = await history.save(
        scope,
        body.conversationId,
        body.messageId,
        question,
        answerDemo(question),
        Date.now() - start,
      );
      return {
        id: body.messageId,
        conversationId: body.conversationId,
        answer,
      };
    }
    @Post("messages/:id/feedback") async feedback(
      @Param("id") id: string,
      @Body() input: unknown,
    ) {
      const body = record(input, ["vote", "comment"]);
      if (
        !uuid(id) ||
        !["yes", "no"].includes(String(body.vote)) ||
        typeof body.comment !== "string" ||
        body.comment.length > 1000
      )
        throw new BadRequestException();
      await history.feedback(scope, id, String(body.vote), body.comment);
      return { saved: true };
    }
  }
  @Module({ controllers: [ChatController] })
  class AppModule {
    async onApplicationShutdown() {
      if (db.isInitialized) await db.destroy();
    }
  }
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: ["error", "warn"],
  });
  app.use(access(process.env));
  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (!["GET", "HEAD"].includes(req.method)) {
        if (!req.is("application/json")) return res.sendStatus(415);
        const origin = req.get("origin");
        const allowed = (process.env.CHAT_ALLOWED_ORIGINS || "").split(",");
        if (origin && !allowed.includes(origin)) return res.sendStatus(403);
      }
      next();
    },
  );
  app.use(express.json({ limit: "12kb" }));
  app.use(
    "/chat",
    express.static(resolve(__dirname, "../../web/dist"), {
      fallthrough: false,
    }),
  );
  app.enableShutdownHooks();
  return app;
}
