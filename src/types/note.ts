export interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  tags: string[];
  project?: string;
  category?: string;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  tags?: string[];
  project?: string;
  category?: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
}
