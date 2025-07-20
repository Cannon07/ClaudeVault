import {
  findNoteByIdInVault,
  searchNotesInVault,
  deleteNoteFromVault,
} from "../../utils/obsidian-git-sync.js";
import { Note } from "../../types/note.js";

export async function handleDeleteNote(args: any): Promise<string> {
  const { identifier, confirm } = args;

  let targetNote: Note | null = null;
  let foundNotes: Note[] = [];

  if (identifier.startsWith("note-")) {
    targetNote = findNoteByIdInVault(identifier);
  } else {
    foundNotes = searchNotesInVault(identifier);
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
        "\n\nPlease specify the exact note ID to delete."
      );
    }
  }

  if (!targetNote) {
    return `No note found matching "${identifier}". Use search_notes to find the right note ID.`;
  }

  if (!confirm) {
    const preview =
      `**Preview of note "${targetNote.title}" (${targetNote.id}) to be deleted:**\n\n` +
      `**Note:**\n` +
      `- Title: ${targetNote.title}\n` +
      `- Content: ${targetNote.content.substring(0, 100)}${targetNote.content.length > 100 ? "..." : ""}\n` +
      `- Tags: ${targetNote.tags.join(", ")}\n` +
      `- Project: ${targetNote.project || "None"}\n` +
      `- Category: ${targetNote.category || "None"}\n\n` +
      `**To confirm deletion, run the command again with confirm=true**`;

    return preview;
  }

  try {
    const result = await deleteNoteFromVault(targetNote.id);

    if (result.success) {
      return `✓ Successfully deleted note "${targetNote.title}" (${targetNote.id})`;
    } else {
      return `✗ Failed to delete note: ${result.message}`;
    }
  } catch (error: any) {
    return `✗ Failed to delete note: ${error.message}`;
  }
}
