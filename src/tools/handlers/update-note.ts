import {
  findNoteByIdInVault,
  searchNotesInVault,
  updateNoteInVault,
} from "../../utils/unified-sync.js";
import { Note } from "../../types/note.js";

export async function handleUpdateNote(args: any): Promise<string> {
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

  // Find the note to update
  let targetNote: Note | null = null;
  let foundNotes: Note[] = [];

  // Try to find by ID first
  if (identifier.startsWith("note-")) {
    targetNote = findNoteByIdInVault(identifier);
  } else {
    // Search by content
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
        "\n\nPlease specify the exact note ID to update."
      );
    }
  }

  if (!targetNote) {
    return `No note found matching "${identifier}". Use search_notes to find the right note ID.`;
  }

  // Prepare updates
  const updates: Partial<Note> = {};

  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (project !== undefined) updates.project = project;
  if (category !== undefined) updates.category = category;

  // Handle tags
  if (tags !== undefined) {
    updates.tags = tags;
  } else {
    // Handle add/remove tags
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

  // If no updates provided
  if (Object.keys(updates).length === 0) {
    return `No updates specified for note "${targetNote.title}" (${targetNote.id}). Specify title, content, tags, project, or category to update.`;
  }

  // Show preview if not confirmed
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

  // Apply the update
  try {
    const result = await updateNoteInVault(targetNote.id, updates);

    if (result.success) {
      return `✓ Successfully updated note "${targetNote.title}" (${targetNote.id})`;
    } else {
      return `✗ Failed to update note: ${result.message}`;
    }
  } catch (error: any) {
    return `✗ Failed to update note: ${error.message}`;
  }
}
