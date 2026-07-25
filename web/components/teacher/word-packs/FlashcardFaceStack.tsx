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
  size?: "md" | "lg" | "xl";
  /** Teacher preview: prompt to fill blank faces. */
  emptyHints?: boolean;
}) {
  if (faces.length === 0) {
    return <p className="text-sm text-neutral-500">Nothing on this side.</p>;
  }

  const titleClass =
    size === "xl"
      ? "text-4xl font-extrabold sm:text-5xl"
      : size === "lg"
        ? "text-2xl font-bold"
        : "text-xl font-bold";
  const bodyClass =
    size === "xl"
      ? "text-xl font-semibold sm:text-2xl"
      : size === "lg"
        ? "text-base"
        : "text-sm";
  const pictureClass =
    size === "xl"
      ? "max-h-[min(62vh,34rem)] w-full max-w-2xl rounded-2xl object-contain"
      : size === "lg"
        ? "max-h-40 w-auto rounded-md border border-neutral-200 object-contain"
        : "max-h-40 w-auto rounded-md border border-neutral-200 object-contain";
  const pictureWrapClass =
    size === "xl" ? "flex w-full max-w-2xl justify-center" : "flex w-full max-w-xs justify-center";
  const emptyClass = emptyHints ? "text-amber-800" : "text-neutral-500";
  const inkClass = size === "xl" ? "text-kid-ink" : "text-neutral-900";
  const bodyInkClass =
    size === "xl" ? "text-kid-ink/90" : "text-neutral-800";
  const exampleInkClass =
    size === "xl" ? "text-kid-ink/80" : "text-neutral-700";

  return (
    <div
      className={
        size === "xl"
          ? "flex w-full flex-col items-center gap-5 text-center"
          : "flex w-full flex-col items-center gap-3 text-center"
      }
    >
      {faces.map((face) => {
        if (face === "word") {
          return (
            <p key={face} className={`${titleClass} ${inkClass}`}>
              {values.word?.trim() || "—"}
            </p>
          );
        }
        if (face === "definition") {
          const text = values.definition?.trim();
          return (
            <p
              key={face}
              className={`${bodyClass} ${text ? bodyInkClass : emptyClass}`}
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
              className={`${bodyClass} italic ${text ? exampleInkClass : emptyClass}`}
            >
              {text ? `“${text}”` : emptyHints ? "Add example…" : "—"}
            </p>
          );
        }
        return (
          <div key={face} className={pictureWrapClass}>
            {values.pictureUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element -- teacher paste URL preview
              <img
                src={values.pictureUrl}
                alt=""
                className={pictureClass}
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
