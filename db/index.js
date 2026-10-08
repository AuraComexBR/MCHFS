// Camada de acesso ao SQLite. Usa o módulo node:sqlite, nativo do
// Node 22+ — sem dependência externa, sem compilação nativa. Ainda
// é "experimental" no Node, mas suficiente para um protótipo local.
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'mchfs.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const isNewDatabase = !fs.existsSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

module.exports = { db, isNewDatabase };
