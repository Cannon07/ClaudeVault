import { getAllNotes } from "../../storage/index.js";

export function handleListNotes(args: any): string {
  const allNotes = getAllNotes().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const notes = args.limit ? allNotes.slice(0, args.limit) : allNotes;

  if (notes.length === 0) {
    return "No notes found";
  }

  return (
    `Your notes (${notes.length} total):\n\n` +
    notes
      .map(
        (note) =>
          `**${note.title}** (${new Date(note.timestamp).toLocaleDateString()})\n${note.content}\nTags: ${note.tags.join(", ")}`,
      )
      .join("\n\n")
  );
}
