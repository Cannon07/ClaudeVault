import { addNoteToVault } from "../../utils/unified-sync.js";

export async function handleAddNote(args: any): Promise<string> {
  try {
    const result = await addNoteToVault({
      title: args.title,
      content: args.content,
      tags: args.tags || [],
      project: args.project,
      category: args.category,
    });

    if (result.success) {
      return `Note "${args.title}" saved successfully with ID: ${result.details}`;
    } else {
      return `Failed to save note: ${result.message}`;
    }
  } catch (error: any) {
    return `Error creating note: ${error.message}`;
  }
}
