-- MCHFS — esquema do protótipo (SQLite)
-- Um único ficheiro local (db/mchfs.sqlite). Simples de propósito:
-- é o suficiente para validar o fluxo de login + módulos antes de
-- decidir onde isto vai morar em produção (ver README sobre isso).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'mentee')) DEFAULT 'mentee',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_index INTEGER NOT NULL DEFAULT 0,
  title_en TEXT NOT NULL,
  title_pt TEXT NOT NULL,
  description_en TEXT DEFAULT '',
  description_pt TEXT DEFAULT '',
  content_en TEXT DEFAULT '',
  content_pt TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  pdf_filename TEXT DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
