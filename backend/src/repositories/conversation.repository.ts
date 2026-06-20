import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client';
import type { Conversation } from '../types';

interface ConversationRow {
  id: string;
  channel: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    channel: row.channel,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function create(channel = 'web'): Conversation {
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO conversations (id, channel) VALUES (?, ?)`
  ).run(id, channel);

  return findById(id) as Conversation;
}

export function findById(id: string): Conversation | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(id) as ConversationRow | undefined;

  return row ? toConversation(row) : null;
}

export function touchUpdatedAt(id: string): void {
  getDb()
    .prepare(
      `UPDATE conversations
          SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?`
    )
    .run(id);
}
