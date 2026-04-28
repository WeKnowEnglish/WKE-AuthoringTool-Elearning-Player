/** Teacher canvas: edit payload in-place; parent keeps authoritative screen list. */
export type LessonPlayerVisualEdit = {
  onPayloadChange: (screenId: string, payload: unknown) => void;
  /** Keep storyboard selection in sync when using Next/Back inside the preview */
  onScreenIndexChange?: (index: number) => void;
};
