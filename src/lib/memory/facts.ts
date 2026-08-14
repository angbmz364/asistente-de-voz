import { generateEmbedding } from "../ai";
import {
  openDatabase,
  persistDatabase,
  removeDocument,
  syncDocument,
} from "../../components/services/database";

/**
 * Pendientes / recordatorios de forma libre, embebidos y vinculados a
 * la tabla `documents` (kind "fact") para su consulta por RAG con
 * "qué tenía pendiente" / ASK_FACTS.
 */

export type Fact = {
  id: number;
  content: string;
  createdAt: string;
};

export const addFact = async (content: string): Promise<Fact> => {
  const db = await openDatabase();
  const createdAt = new Date().toISOString();
  const embedding = await generateEmbedding(content);

  db.run("INSERT INTO facts (content, embedding, created_at) VALUES (?, ?, ?);", [
    content,
    JSON.stringify(embedding),
    createdAt,
  ]);
  const id = Number(db.exec("SELECT last_insert_rowid() AS id;")[0].values[0][0]);

  await syncDocument("fact", id, content);
  persistDatabase(db);

  return { id, content, createdAt };
};

export const getFacts = async (): Promise<Fact[]> => {
  const db = await openDatabase();
  const statement = db.prepare(
    "SELECT id, content, created_at FROM facts ORDER BY id DESC;"
  );
  const facts: Fact[] = [];

  while (statement.step()) {
    const row = statement.getAsObject();
    facts.push({
      id: Number(row.id),
      content: String(row.content),
      createdAt: String(row.created_at),
    });
  }

  statement.free();
  return facts;
};

export const listFactsText = async (): Promise<string> => {
  const facts = await getFacts();
  if (facts.length === 0) return "";
  return `Pendientes y recordatorios:\n${facts.map((f) => `- ${f.content}`).join("\n")}`;
};

export const removeFactById = async (id: number): Promise<void> => {
  const db = await openDatabase();
  db.run("DELETE FROM facts WHERE id = ?;", [id]);
  await removeDocument("fact", id);
  persistDatabase(db);
};