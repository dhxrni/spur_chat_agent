CREATE TABLE IF NOT EXISTS faqs (
  id         TEXT PRIMARY KEY,
  topic      TEXT NOT NULL,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_faqs_topic ON faqs (topic);
