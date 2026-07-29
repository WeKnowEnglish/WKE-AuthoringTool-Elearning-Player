/** Role for a lexicon ↔ media_assets link (many images/audio per word allowed). */
export type LexiconMediaRole =
  | "illustration"
  | "pronunciation"
  | "scene"
  | "other";

export type LexiconMediaLinkRow = {
  id: string;
  lexiconId: string;
  mediaAssetId: string;
  role: LexiconMediaRole;
  createdBy: string;
  createdAt: string;
  publicUrl: string;
  contentType: string;
  originalFilename: string;
  itemName: string | null;
};
