export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  collectionId: string | null;
  tags: string[];
  favorite: boolean;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
}

export type Filter =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "collection"; id: string }
  | { kind: "tag"; tag: string };

export type BookmarkDraft = Omit<Bookmark, "id" | "createdAt"> & { id?: string };
