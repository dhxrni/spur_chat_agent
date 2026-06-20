import { getDb } from '../db/client';
import type { Faq } from '../types';

interface FaqRow {
  id: string;
  topic: string;
  question: string;
  answer: string;
  created_at: string;
}

function toFaq(row: FaqRow): Faq {
  return {
    id: row.id,
    topic: row.topic,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at,
  };
}

export function findAll(): Faq[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM faqs ORDER BY topic ASC, question ASC`
    )
    .all() as FaqRow[];

  return rows.map(toFaq);
}
