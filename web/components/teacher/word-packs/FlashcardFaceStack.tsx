import type {
  PackFlashcardCompiledCard,
  PackFlashcardFace,
  PackFlashcardFaceSnapshot,
} from "@/lib/vocabulary/pack-flashcards";

export function faceLabel(face: PackFlashcardFace): string {
  if (face === "word") return "Word";
  if (face === "definition") return "Definition";
  if (face === "example") return "Example";
  return "Picture";
}

export function facesForSide(
  card: PackFlashcardCompiledCard,
  side: "front" | "back",
): PackFlashcardFace[] {
  return side === "front" ? card.frontFaces : card.backFaces;
}

export function FlashcardFaceStack({
  faces,
  values,
  size = "md",
  emptyHints = false,
}: {
  faces: readonly PackFlashcardFace[];
  values: PackFlashcardFaceSnapshot;
  size?: "md" | "lg";
  /** Teacher preview: prompt to fill blank faces. */
  emptyHints?: boolean;
}) {
  if (faces.length === 0) {
    return <p className="text-sm text-neutral-500">Nothing on this side.</p>;
  }

  const titleClass = size === "lg" ? "text-2xl font-bold" : "text-xl font-bold";
  const bodyClass = size === "lg" ? "text-base" : "text-sm";
  const emptyClass = emptyHints ? "text-amber-800" : "text-neutral-500";

  return (
    <div className="flex w-full flex-col items-center gap-3 text-center">
      {faces.map((face) => {
        if (face === "word") {
          return (
            <p key={face} className={`${titleClass} text-neutral-900`}>
              {values.word?.trim() || "—"}
            </p>
          );
        }
        if (face === "definition") {
          const text = values.definition?.trim();
          return (
            <p
              key={face}
              className={`${bodyClass} ${text ? "text-neutral-800" : emptyClass}`}
            >
              {text || (emptyHints ? "Add definition…" : "—")}
            </p>
          );
        }
        if (face === "example") {
          const text = values.example?.trim();
          return (
            <p
              key={face}
              className={`${bodyClass} italic ${text ? "text-neutral-700" : emptyClass}`}
            >
              {text ? `“${text}”` : emptyHints ? "Add example…" : "—"}
            </p>
          );
        }
        return (
          <div key={face} className="flex w-full max-w-xs justify-center">
            {values.pictureUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element -- teacher paste URL preview
              <img
                src={values.pictureUrl}
                alt=""
                className="max-h-40 w-auto rounded-md border border-neutral-200 object-contain"
              />
            ) : (
              <p className={`${bodyClass} ${emptyClass}`}>
                {emptyHints ? "Add picture URL…" : "—"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
