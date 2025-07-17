/**
 * Core storage operations for notes.
 * Handles reading/writing notes as JSON files in the personal knowledge base repository.
 */
import * as fs from "fs";
import * as path from "path";
import { Note } from "../types/note.js";

// Load environment variables manually from .env file
function loadEnvVariables() {
  const envPath = path.join(process.cwd(), ".env");

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split("\n");

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

// Load environment variables
loadEnvVariables();

// Configuration from environment variables
const NOTES_REPO_PATH = process.env.NOTES_REPO_PATH;
const DATA_SUBFOLDER = process.env.DATA_SUBFOLDER || "notes";

if (!NOTES_REPO_PATH) {
  throw new Error(
    "NOTES_REPO_PATH environment variable is required. Please check your .env file.",
  );
}

// Point to the notes repository
const DATA_DIR = path.join(NOTES_REPO_PATH, DATA_SUBFOLDER);

// Ensure notes directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveNote(note: Note): void {
  const filename = `${note.id}.json`;
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(note, null, 2));
}

export function getAllNotes(): Note[] {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json"));
  return files.map((file) => {
    const filepath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(content) as Note;
  });
}

export function searchNotes(query: string): Note[] {
  const allNotes = getAllNotes();
  const lowerQuery = query.toLowerCase();

  return allNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      note.project?.toLowerCase().includes(lowerQuery) ||
      note.category?.toLowerCase().includes(lowerQuery),
  );
}

export function findNoteById(id: string): Note | null {
  const filepath = path.join(DATA_DIR, `${id}.json`);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(content) as Note;
  } catch (error) {
    console.error(`Error reading note ${id}:`, error);
    return null;
  }
}

export function findNotesBySearch(query: string): Note[] {
  return searchNotes(query);
}

export function updateNote(id: string, updates: Partial<Note>): boolean {
  const existingNote = findNoteById(id);
  if (!existingNote) {
    return false;
  }

  const updatedNote: Note = {
    ...existingNote,
    ...updates,
    id: existingNote.id,
    timestamp: existingNote.timestamp,
  };

  try {
    const filepath = path.join(DATA_DIR, `${id}.json`);
    fs.writeFileSync(filepath, JSON.stringify(updatedNote, null, 2));
    return true;
  } catch (error) {
    console.error(`Error updating note ${id}:`, error);
    return false;
  }
}

export function deleteNote(id: string): boolean {
  const existingNote = findNoteById(id);
  if (!existingNote) {
    return false;
  }

  try {
    const filepath = path.join(DATA_DIR, `${id}.json`);
    fs.unlinkSync(filepath);
    return true;
  } catch (error) {
    console.error(`Error deleting note ${id}:`, error);
    return false;
  }
}
