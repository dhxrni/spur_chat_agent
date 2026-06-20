import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client';
import type { ChatMessage, Sender } from '../types';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender: Sender;
  text: string;
  created_at: string;
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sender: row.sender,
    text: row.text,
    createdAt: row.created_at,
  };
}

export function create(
  conversationId: string,
  sender: Sender,
  text: string
): ChatMessage {
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender, text) VALUES (?, ?, ?, ?)`
  ).run(id, conversationId, sender, text);

  const row = db
    .prepare(`SELECT * FROM messages WHERE id = ?`)
    .get(id) as MessageRow;

  return toMessage(row);
}

export function findRecentByConversation(
  conversationId: string,
  limit: number
): ChatMessage[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM (
         SELECT * FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at DESC
          LIMIT ?
       ) ORDER BY created_at ASC`
    )
    .all(conversationId, limit) as MessageRow[];

  return rows.map(toMessage);
}

export function findAllByConversation(conversationId: string): ChatMessage[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC`
    )
    .all(conversationId) as MessageRow[];

  return rows.map(toMessage);
}
