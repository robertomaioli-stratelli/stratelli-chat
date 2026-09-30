import { MigrationInterface, QueryRunner } from "typeorm";
export class History1790760000000 implements MigrationInterface {
  async up(db: QueryRunner): Promise<void> {
    await db.query(`CREATE TABLE chat_conversations (
      id uuid PRIMARY KEY,
      user_id varchar(160) NOT NULL,
      city_id varchar(7) NOT NULL CHECK (city_id ~ '^[0-9]{7}$'),
      title varchar(120) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await db.query(
      "CREATE INDEX chat_conversations_scope ON chat_conversations (user_id, city_id, updated_at DESC)",
    );
    await db.query(`CREATE TABLE chat_messages (
      id uuid PRIMARY KEY,
      conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      question varchar(2000) NOT NULL,
      answer jsonb NOT NULL,
      provider varchar(40) NOT NULL DEFAULT 'demo',
      model varchar(120),
      input_tokens integer CHECK (input_tokens >= 0),
      output_tokens integer CHECK (output_tokens >= 0),
      latency_ms integer NOT NULL CHECK (latency_ms >= 0),
      feedback varchar(3) CHECK (feedback IN ('yes', 'no')),
      feedback_comment varchar(1000),
      feedback_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await db.query(
      "CREATE INDEX chat_messages_conversation ON chat_messages (conversation_id, created_at, id)",
    );
  }
  async down(db: QueryRunner): Promise<void> {
    await db.query("DROP TABLE chat_messages");
    await db.query("DROP TABLE chat_conversations");
  }
}
