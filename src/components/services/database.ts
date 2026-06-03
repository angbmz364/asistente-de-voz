import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

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
    "Ariana Pequeña",
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
    ["academicLevel", "5to de secundaria"],
    ["tutor", "Walter Blancas"],
    ["classPet", "Alessandro, el cerdito amistoso"],
    ["schedule", "Lunes a viernes 7:20 AM a 2:30 PM"],
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
  persistDatabase(db);

  return {
    id: Number(db.exec("SELECT last_insert_rowid() AS id;")[0].values[0][0]),
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
  persistDatabase(db);
};
