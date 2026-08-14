import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { generateEmbedding } from "../../lib/ai";

export type Student = {
  id: number;
  name: string;
  seat: string;
};

export type Group = {
  id: number;
  name: string;
  members: string[];
  createdAt: string;
};

export type Homework = {
  id: number;
  description: string;
  dueDate: string | null;
  createdAt: string;
};

export type ClassInfo = {
  tutor: string;
  classPet: string;
  school: string;
  academicLevel: string;
  schedule: string;
  breakTimes: string;
  description: string;
  creators?: string;
};

export type DocumentKind =
  | "homework"
  | "group"
  | "student"
  | "class_info"
  | "fact"
  | "summary";

const STORAGE_KEY = "nova_school_assistant_db_v1";
let SQL: SqlJsStatic | null = null;
let database: Database | null = null;

const toBase64 = (buffer: Uint8Array): string => btoa(String.fromCharCode(...buffer));
const fromBase64 = (base64: string): Uint8Array =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

const initializeSchema = (db: Database): void => {
  db.run(`
    CREATE TABLE IF NOT EXISTS class_info (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      seat TEXT
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      members TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      embedding TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      embedding TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      entity_id INTEGER,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
};

const persistDatabase = (db: Database): void => {
  const bytes = db.export();

  try {
    localStorage.setItem(STORAGE_KEY, toBase64(bytes));
  } catch (error) {
    console.error("Failed to persist the local SQLite database:", error);
  }
};

/**
 * Re-embebe y re-escribe la proyección RAG de un registro fuente.
 * No persiste: el llamador es responsable de persistDatabase.
 */
export const syncDocument = async (
  kind: DocumentKind,
  entityId: number | null,
  content: string
): Promise<void> => {
  if (!content.trim()) return;

  const db = await openDatabase();
  const embedding = await generateEmbedding(content);

  const removeStmt = db.prepare(
    "DELETE FROM documents WHERE kind = ? AND (entity_id IS ? OR entity_id = ?);"
  );
  removeStmt.run([kind, entityId, entityId]);
  removeStmt.free();

  db.run(
    "INSERT INTO documents (kind, entity_id, content, embedding, created_at) VALUES (?, ?, ?, ?, ?);",
    [kind, entityId, content, JSON.stringify(embedding), new Date().toISOString()]
  );
};

/**
 * Borra la proyección RAG de un registro fuente concreto.
 */
export const removeDocument = async (
  kind: DocumentKind,
  entityId: number
): Promise<void> => {
  const db = await openDatabase();
  db.run("DELETE FROM documents WHERE kind = ? AND entity_id = ?;", [kind, entityId]);
};

/**
 * Borra todas las proyecciones RAG de un tipo.
 */
export const removeDocumentsByKind = async (kind: DocumentKind): Promise<void> => {
  const db = await openDatabase();
  db.run("DELETE FROM documents WHERE kind = ?;", [kind]);
};

const seedDatabase = (db: Database): void => {
  const studentNames = [
    "Cela Anaya",
    "Maria Diaz",
    "Cielo Serpa",
    "Enzo Puca",
    "Luciana Espinoza",
    "Cristel Quispe",
    "Valeria Sindico",
    "Bayron Camayo",
    "Ramses Gutierrez",
    "Rodrigo Chero",
    "Tirso Campos",
    "Sebastian Araujo",
    "Connie Ore",
    "Sahory Torres",
    "Thais Espinoza",
    "Gabriela Vargas",
    "Camila Peralta",
    "Fatima Torres",
    "Fatima Mamani",
    "Angel Bernal",
    "Ariana Rojas",
    "Ariana Rengifo",
    "Edahir Quispe",
    "Misael Herrera",
    "Vasco Cardenas",
    "Alessando Ale",
    "Sergio Gutierrez",
  ];

  const studentInsert = db.prepare(
    "INSERT INTO students (name, seat) VALUES (?, ?);"
  );

  studentNames.forEach((name, index) => {
    studentInsert.run([name, `Ficha ${index + 1}`]);
  });
  studentInsert.free();

  const classInfoInsert = db.prepare(
    "INSERT OR REPLACE INTO class_info (key, value) VALUES (?, ?);"
  );

  const classInfo: Array<[string, string]> = [
    ["school", "Colegio San Carlos"],
    ["academicLevel", "quinto de secundaria"],
    ["tutor del salon", "Walter Blancas"],
    ["classPet", "Alessandro, el cerdito amistoso"],
    [
      "schedule", 
      "Lunes:Artes Creativas-07:40-09:10;Trigonometría-09:10-11:00;Inglés-11:00-12:30;Geometría-13:00-14:30;Martes:Habilidades-07:40-09:10;Raz. Verbal-09:10-11:00;Física-11:00-12:30;Inglés-13:00-14:30;Miércoles:Computación-07:40-09:10;Álgebra-09:10-11:00;Ecología-11:00-12:30;Biología-13:00-14:30;Jueves:Química-07:40-09:10;Lenguaje-09:10-11:00;Ciencias S.-11:00-12:30;Raz. Matemático-13:00-14:30;Viernes:Investigación-07:40-09:10;Literatura-09:10-09:55;Plan Lector-10:15-11:00;Aritmética-11:00-12:30;Ed. Física-13:00-14:30;"],
    ["breakTimes", "9:55 AM - 10:15 AM y 12:30 PM - 1:00 PM"],
    [
      "description",
      "El asistente usa el contexto de la clase para responder preguntas escolares y organizar grupos de trabajo.",
    ],
    [
      "creators",
      "El grupo de Enzo Puca, formado por Angel Bernal, Misael Herrera, Sergio Gutierrez, Enzo Puca, Sebastian Araujo. Siendo Angel Bernal el programador principal.",
    ],
  ];

  classInfo.forEach(([key, value]) => {
    classInfoInsert.run([key, value]);
  });
  classInfoInsert.free();
};

const openDatabase = async (): Promise<Database> => {
  if (database) {
    console.info('Nova local database already opened.');
    return database;
  }

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    });
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  database = saved ? new SQL.Database(fromBase64(saved)) : new SQL.Database();

  initializeSchema(database);

  if (!saved) {
    seedDatabase(database);
    persistDatabase(database);
    console.info(`Nova local database created and initialized. Saved to localStorage key: ${STORAGE_KEY}`);
  } else {
    console.info(`Nova local database loaded from localStorage key: ${STORAGE_KEY}`);
  }

  return database;
};

export const initDatabase = async (): Promise<void> => {
  await openDatabase();

  try {
    // Attach lightweight debug helpers for DevTools inspection
    type NovaDBWindow = Window & {
      novaDB?: {
        getAllStudents: typeof getAllStudents;
        getGroups: typeof getGroups;
        getClassInfo: typeof getClassInfo;
        createGroupsBySize: typeof createGroupsBySize;
        clearGroups: typeof clearGroups;
        addHomework: typeof addHomework;
        getHomework: typeof getHomework;
        clearHomework: typeof clearHomework;
        storageKey: string;
        checkStorage: () => boolean;
      };
    };

    const win = window as NovaDBWindow;
    win.novaDB = {
      getAllStudents,
      getGroups,
      getClassInfo,
      createGroupsBySize,
      clearGroups,
      storageKey: STORAGE_KEY,
      checkStorage: () => localStorage.getItem(STORAGE_KEY) !== null,
      addHomework,
      getHomework,
      clearHomework,
    };
    console.info('Nova DB debug helpers attached: window.novaDB');
    console.info('Nova local database initialization complete.');
  } catch (e) {
    console.error('Nova DB helper attach failed:', e);
  }
};

export const getAllStudents = async (): Promise<Student[]> => {
  const db = await openDatabase();
  const statement = db.prepare("SELECT id, name, seat FROM students ORDER BY name;");
  const students: Student[] = [];

  while (statement.step()) {
    const row = statement.getAsObject();
    students.push({
      id: Number(row.id),
      name: String(row.name),
      seat: String(row.seat),
    });
  }

  statement.free();
  return students;
};

export const getClassInfo = async (): Promise<ClassInfo> => {
  const db = await openDatabase();
  const statement = db.prepare("SELECT key, value FROM class_info;");
  const info: Record<string, string> = {};

  while (statement.step()) {
    const row = statement.getAsObject();
    info[String(row.key)] = String(row.value);
  }

  statement.free();

  return {
    tutor: info.tutor || "",
    classPet: info.classPet || "",
    school: info.school || "",
    academicLevel: info.academicLevel || "",
    schedule: info.schedule || "",
    breakTimes: info.breakTimes || "",
    description: info.description || "",
    creators: info.creators || "",
  };
};

export const getClassInfoContext = async (): Promise<string> => {
  const info = await getClassInfo();
  return [
    `Escuela: ${info.school}`,
    `Nivel: ${info.academicLevel}`,
    `Tutor: ${info.tutor}`,
    `Mascota de clase: ${info.classPet}`,
    info.creators ? `Creadores: ${info.creators}` : "",
    `Horario: ${info.schedule}`,
    `Receso: ${info.breakTimes}`,
  ]
    .filter(Boolean)
    .join(". ");
};

export const clearGroups = async (): Promise<void> => {
  const db = await openDatabase();
  db.run("DELETE FROM groups;");
  await removeDocumentsByKind("group");
  persistDatabase(db);
};

export const createGroupsBySize = async (groupSize: number): Promise<Group[]> => {
  const students = await getAllStudents();
  const groups: Group[] = [];
  let bucket: string[] = [];

  students.forEach((student, index) => {
    bucket.push(student.name);

    if (bucket.length === groupSize || index === students.length - 1) {
      groups.push({
        id: groups.length + 1,
        name: `Grupo ${groups.length + 1}`,
        members: [...bucket],
        createdAt: new Date().toISOString(),
      });
      bucket = [];
    }
  });

  const db = await openDatabase();
  db.run("DELETE FROM groups;");

  const insertGroup = db.prepare(
    "INSERT INTO groups (name, members, created_at) VALUES (?, ?, ?);"
  );

  groups.forEach((group) => {
    insertGroup.run([group.name, JSON.stringify(group.members), group.createdAt]);
  });

  insertGroup.free();

  await removeDocumentsByKind("group");
  const realGroups = await getGroups();
  for (const group of realGroups) {
    await syncDocument(
      "group",
      group.id,
      `Grupo ${group.id}: miembros ${group.members.join(", ")}`
    );
  }

  persistDatabase(db);

  return groups;
};

export const getGroups = async (): Promise<Group[]> => {
  const db = await openDatabase();

  const statement = db.prepare(
    "SELECT id, name, members, created_at FROM groups ORDER BY id;"
  );
  const groups: Group[] = [];

  while (statement.step()) {
    const row = statement.getAsObject();
    groups.push({
      id: Number(row.id),
      name: String(row.name),
      members: JSON.parse(String(row.members)),
      createdAt: String(row.created_at),
    });
  }

  statement.free();
  return groups;
};

export const addHomework = async (
  description: string,
  dueDate: string | null = null
): Promise<Homework> => {
  const db = await openDatabase();
  const createdAt = new Date().toISOString();

  const insertHomework = db.prepare(
    "INSERT INTO homework (description, due_date, created_at) VALUES (?, ?, ?);"
  );
  insertHomework.run([description, dueDate, createdAt]);
  insertHomework.free();
  const id = Number(db.exec("SELECT last_insert_rowid() AS id;")[0].values[0][0]);

  await syncDocument(
    "homework",
    id,
    dueDate ? `Tarea: ${description}. Fecha de entrega: ${dueDate}` : `Tarea: ${description}`
  );
  persistDatabase(db);

  return {
    id,
    description,
    dueDate,
    createdAt,
  };
};

export const getHomework = async (): Promise<Homework[]> => {
  const db = await openDatabase();
  const statement = db.prepare(
    "SELECT id, description, due_date, created_at FROM homework ORDER BY id;"
  );
  const homework: Homework[] = [];

  while (statement.step()) {
    const row = statement.getAsObject();
    homework.push({
      id: Number(row.id),
      description: String(row.description),
      dueDate: row.due_date ? String(row.due_date) : null,
      createdAt: String(row.created_at),
    });
  }

  statement.free();
  return homework;
};

export const clearHomework = async (): Promise<void> => {
  const db = await openDatabase();
  db.run("DELETE FROM homework;");
  await removeDocumentsByKind("homework");
  persistDatabase(db);
};
