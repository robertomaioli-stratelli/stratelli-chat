import { ConflictException, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
export type Scope = { userId: string; cityId: string };
export class History {
  constructor(private readonly db: DataSource) {}
  async list(scope: Scope) {
    return this.db.query(
      `SELECT id, title, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM chat_conversations WHERE user_id=$1 AND city_id=$2 ORDER BY updated_at DESC, id LIMIT 100`,
      [scope.userId, scope.cityId],
    );
  }
  async messages(scope: Scope, id: string) {
    const [conversation] = await this.db.query(
      "SELECT id FROM chat_conversations WHERE id=$1 AND user_id=$2 AND city_id=$3",
      [id, scope.userId, scope.cityId],
    );
    if (!conversation) throw new NotFoundException("Conversa não encontrada.");
    return this.db.query(
      `SELECT id, question, answer, feedback, feedback_comment AS "feedbackComment", created_at AS "createdAt"
      FROM chat_messages WHERE conversation_id=$1 ORDER BY created_at, id LIMIT 200`,
      [id],
    );
  }
  async save(
    scope: Scope,
    conversationId: string,
    id: string,
    question: string,
    answer: unknown,
    latency: number,
  ) {
    return this.db.transaction(async (db) => {
      await db.query(
        `INSERT INTO chat_conversations (id,user_id,city_id,title) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [conversationId, scope.userId, scope.cityId, question.slice(0, 120)],
      );
      const [conversation] = await db.query(
        "SELECT id FROM chat_conversations WHERE id=$1 AND user_id=$2 AND city_id=$3 FOR UPDATE",
        [conversationId, scope.userId, scope.cityId],
      );
      if (!conversation)
        throw new NotFoundException("Conversa não encontrada.");
      const [existing] = await db.query(
        "SELECT id,question,answer,conversation_id FROM chat_messages WHERE id=$1",
        [id],
      );
      if (existing) {
        if (
          existing.conversation_id !== conversationId ||
          existing.question !== question
        )
          throw new ConflictException(
            "Identificador de mensagem já utilizado.",
          );
        return existing.answer;
      }
      const [{ count }] = await db.query(
        "SELECT count(*)::int AS count FROM chat_messages WHERE conversation_id=$1",
        [conversationId],
      );
      if (count >= 200)
        throw new ConflictException("Inicie uma nova conversa para continuar.");
      await db.query(
        "INSERT INTO chat_messages (id,conversation_id,question,answer,latency_ms) VALUES ($1,$2,$3,$4,$5)",
        [id, conversationId, question, JSON.stringify(answer), latency],
      );
      await db.query(
        "UPDATE chat_conversations SET updated_at=now() WHERE id=$1",
        [conversationId],
      );
      return answer;
    });
  }
  async feedback(scope: Scope, id: string, vote: string, comment: string) {
    const result = await this.db.query(
      `UPDATE chat_messages m SET feedback=$1,feedback_comment=$2,feedback_at=now()
      FROM chat_conversations c WHERE m.conversation_id=c.id AND m.id=$3 AND c.user_id=$4 AND c.city_id=$5 RETURNING m.id`,
      [vote, comment, id, scope.userId, scope.cityId],
    );
    // TypeORM PostgreSQL UPDATE results are [rows, count].
    if (!result[0]?.length)
      throw new NotFoundException("Mensagem não encontrada.");
  }
}
