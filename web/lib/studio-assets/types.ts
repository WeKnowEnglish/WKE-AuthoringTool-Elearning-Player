export type StudioAssetKind = "image" | "audio";

export type StudioAssetRow = {
  id: string;
  storage_path: string;
  public_url: string;
  kind: StudioAssetKind;
  content_type: string;
  original_filename: string;
  byte_size: number;
  uploaded_by: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export type PublishStudioAssetResult = {
  id: string;
  public_url: string;
  storage_path: string;
  kind: StudioAssetKind;
  content_type: string;
  original_filename: string;
  byte_size: number;
  /** True when an existing identical file for this teacher was reused. */
  reused?: boolean;
};
