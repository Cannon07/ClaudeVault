import {
  Note,
  updateNote,
  findNoteById,
  searchNotes,
} from "../../storage/index.js";

export function handleUpdateNote(args: any): string {
  const {
    identifier,
    confirm,
    title,
    content,
    tags,
    add_tags,
    remove_tags,
    project,
    category,
  } = args;

  let targetNote: Note | null = null;
  let foundNotes: Note[] = [];

  if (identifier.startsWith("note-")) {
    targetNote = findNoteById(identifier);
  } else {
    foundNotes = searchNotes(identifier);
    if (foundNotes.length === 1) {
      targetNote = foundNotes[0];
    } else if (foundNotes.length > 1) {
      return (
        `Found ${foundNotes.length} notes matching "${identifier}":\n\n` +
        foundNotes
          .map(
            (note, i) =>
              `${i + 1}. **${note.title}** (${note.id})\n${note.content.substring(0, 100)}...`,
          )
          .join("\n\n") +
        "\n\nPlease specify the exact note ID to update."
      );
    }
  }

  if (!targetNote) {
    return `No note found matching "${identifier}". Use search_notes to find the right note ID.`;
  }

  const updates: Partial<Note> = {};

  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (project !== undefined) updates.project = project;
  if (category !== undefined) updates.category = category;

  if (tags !== undefined) {
    updates.tags = tags;
  } else {
    let newTags = [...targetNote.tags];

    if (add_tags) {
      add_tags.forEach((tag: string) => {
        if (!newTags.includes(tag)) {
          newTags.push(tag);
        }
      });
    }

    if (remove_tags) {
      newTags = newTags.filter((tag) => !remove_tags.includes(tag));
    }

    if (add_tags || remove_tags) {
      updates.tags = newTags;
    }
  }

  if (Object.keys(updates).length === 0) {
    return `No updates specified for note "${targetNote.title}" (${targetNote.id}). Specify title, content, tags, project, or category to update.`;
  }

  if (!confirm) {
    const preview =
      `**Preview of changes to "${targetNote.title}" (${targetNote.id}):**\n\n` +
      `**Current values:**\n` +
      `- Title: ${targetNote.title}\n` +
      `- Content: ${targetNote.content.substring(0, 100)}${targetNote.content.length > 100 ? "..." : ""}\n` +
      `- Tags: ${targetNote.tags.join(", ")}\n` +
      `- Project: ${targetNote.project || "None"}\n` +
      `- Category: ${targetNote.category || "None"}\n\n` +
      `**Changes:**\n` +
      Object.entries(updates)
        .map(([key, value]) => {
          if (key === "tags" && Array.isArray(value)) {
            return `- ${key}: ${value.join(", ")}`;
          }
          return `- ${key}: ${value}`;
        })
        .join("\n") +
      `\n\n**To confirm these changes, run the command again with confirm=true**`;

    return preview;
  }

  const success = updateNote(targetNote.id, updates);

  if (success) {
    return `✓ Successfully updated note "${targetNote.title}" (${targetNote.id})`;
  } else {
    return `✗ Failed to update note "${targetNote.title}" (${targetNote.id})`;
  }
}
