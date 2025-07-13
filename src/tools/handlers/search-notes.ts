import { searchNotes } from "../../storage/index.js";

export function handleSearchNotes(args: any): string {
  const results = searchNotes(args.query);
  if (results.length === 0) {
    return `No notes found matching "${args.query}"`;
  }

  return (
    `Found ${results.length} notes:\n\n` +
    results
      .map(
        (note) =>
          `**${note.title}** (${note.id})\n${note.content}\nTags: ${note.tags.join(", ")}`,
      )
      .join("\n\n")
  );
}
