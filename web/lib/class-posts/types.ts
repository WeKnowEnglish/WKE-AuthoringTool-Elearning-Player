export type ClassPostKind = "announcement" | "photo";

export type ClassPost = {
  id: string;
  classId: string;
  teacherId: string;
  kind: ClassPostKind;
  body: string;
  imageUrl: string | null;
  publishedAt: string;
  createdAt: string;
};
