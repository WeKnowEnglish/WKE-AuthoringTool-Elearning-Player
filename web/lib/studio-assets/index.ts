export { studioCorsHeaders, allowedStudioOrigins } from "@/lib/studio-assets/cors";
export {
  publishStudioAssetFromFormData,
  resolveStudioTeacherClient,
  StudioAssetAuthError,
  StudioAssetValidationError,
} from "@/lib/studio-assets/publish";
export type {
  PublishStudioAssetResult,
  StudioAssetKind,
  StudioAssetRow,
} from "@/lib/studio-assets/types";
export {
  STUDIO_ASSET_MAX_BYTES,
  STUDIO_MEDIA_BUCKET,
  sanitizeStudioFilename,
} from "@/lib/studio-assets/validate";
