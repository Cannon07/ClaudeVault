/**
 * Core storage operations for notes.
 * Handles reading/writing notes as JSON files in the data directory.
 */
import * as fs from "fs";
import * as path from "path";
import { Note } from "../types/note.js";

const DATA_DIR = path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveNote(note: Note): void {
  const filename = `${note.id}.json`;
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(note, null, 2));
}

export function getAllNotes(): Note[] {
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
  const filePath = path.join(DATA_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
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
    const filePath = path.join(DATA_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(updatedNote, null, 2));
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
    const filePath = path.join(DATA_DIR, `${id}.json`);
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting note ${id}:`, error);
    return false;
  }
}
