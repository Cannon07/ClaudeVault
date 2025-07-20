import { Note } from "../../types/note.js";

/**
 * Format note as Obsidian markdown with enhanced metadata
 */
export function formatNoteAsMarkdown(
  note: Note,
  relatedNotes: Note[] = [],
): string {
  const frontmatter = `---
id: ${note.id}
created: ${note.timestamp}
updated: ${new Date().toISOString()}
project: "${note.project || ""}"
category: "${note.category || ""}"
tags: [${note.tags.map((tag) => `"${tag}"`).join(", ")}]
source: "ClaudeVault"
version: "2.0"
---

`;

  // Build related notes section
  const relatedSection =
    relatedNotes.length > 0
      ? `

---

## Related Notes
${relatedNotes
        .map(
          (related) =>
            `- [[${sanitizeFilename(related.title)}|${related.title}]] - ${related.tags
              .filter((tag) => note.tags.includes(tag))
              .map((tag) => `#${tag}`)
              .join(" ")}`,
        )
        .join("\n")}

💡 *Auto-generated connections based on shared tags and content similarity*
`
      : "";

  const tagString =
    note.tags.length > 0
      ? note.tags.map((tag) => `#${tag.replace(/[\s\-]/g, "_")}`).join(" ")
      : "";

  const content = `# ${note.title}

${note.content}
${relatedSection}

---

## Metadata
- 📁 **Project:** ${note.project || "None"}
- 🏷️ **Category:** ${note.category || "None"}  
- 📅 **Created:** ${new Date(note.timestamp).toLocaleDateString()}
- 🔄 **Updated:** ${new Date().toLocaleDateString()}
- 🔗 **ClaudeVault ID:** \`${note.id}\`

${tagString}
`;

  return frontmatter + content;
}

/**
 * Parse markdown file back to Note object
 */
export function parseMarkdownToNote(markdown: string): Note | null {
  try {
    // Extract frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const content = markdown.substring(frontmatterMatch[0].length);

    // Parse frontmatter fields
    const id = extractFrontmatterField(frontmatter, "id");
    const created = extractFrontmatterField(frontmatter, "created");
    const project = extractFrontmatterField(frontmatter, "project");
    const category = extractFrontmatterField(frontmatter, "category");
    const tagsStr = extractFrontmatterField(frontmatter, "tags");

    // Extract title from markdown content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : "Untitled";

    // Extract main content (everything between title and metadata section)
    const mainContentMatch = content.match(/^#\s+.+\n\n([\s\S]*?)\n\n---/);
    const mainContent = mainContentMatch ? mainContentMatch[1].trim() : "";

    // Parse tags from frontmatter
    let tags: string[] = [];
    if (tagsStr) {
      const tagsMatch = tagsStr.match(/\[(.*?)\]/);
      if (tagsMatch) {
        tags = tagsMatch[1]
          .split(",")
          .map((tag) => tag.trim().replace(/"/g, ""))
          .filter((tag) => tag.length > 0);
      }
    }

    if (!id || !created) return null;

    return {
      id,
      title,
      content: mainContent,
      timestamp: created,
      tags,
      project: project ? project.replace(/"/g, "") : undefined,
      category: category ? category.replace(/"/g, "") : undefined,
    };
  } catch (error) {
    console.error("Error parsing markdown to note:", error);
    return null;
  }
}

/**
 * Extract field value from frontmatter
 */
function extractFrontmatterField(
  frontmatter: string,
  field: string,
): string | undefined {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : undefined;
}

/**
 * Helper function to sanitize filename (used in related notes linking)
 */
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .toLowerCase()
    .substring(0, 100); // Limit length
}

/**
 * Validate note object has required fields
 */
export function validateNote(note: Partial<Note>): note is Note {
  return !!(
    note.id &&
    note.title &&
    note.content !== undefined &&
    note.timestamp &&
    Array.isArray(note.tags)
  );
}

/**
 * Create minimal frontmatter for a note
 */
export function createMinimalFrontmatter(note: Note): string {
  return `---
id: ${note.id}
created: ${note.timestamp}
updated: ${new Date().toISOString()}
tags: [${note.tags.map((tag) => `"${tag}"`).join(", ")}]
---

`;
}

/**
 * Extract just the content without metadata sections
 */
export function extractPureContent(markdown: string): string {
  try {
    // Remove frontmatter
    const withoutFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---\n\n/, "");

    // Remove title
    const withoutTitle = withoutFrontmatter.replace(/^#\s+.+\n\n/, "");

    // Extract content before metadata section
    const contentMatch = withoutTitle.match(
      /^([\s\S]*?)\n\n---\n\n## Metadata/,
    );

    return contentMatch ? contentMatch[1].trim() : withoutTitle.trim();
  } catch (error) {
    console.error("Error extracting pure content:", error);
    return markdown;
  }
}
