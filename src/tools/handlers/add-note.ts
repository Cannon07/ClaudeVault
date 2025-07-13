import { Note, saveNote } from "../../storage/index.js";

export function handleAddNote(args: any): string {
  const note: Note = {
    id: `note-${Date.now()}`,
    title: args.title,
    content: args.content,
    timestamp: new Date().toISOString(),
    tags: args.tags || [],
    project: args.project,
    category: args.category,
  };

  saveNote(note);
  return `Note "${note.title}" saved successfully with ID: ${note.id}`;
}
