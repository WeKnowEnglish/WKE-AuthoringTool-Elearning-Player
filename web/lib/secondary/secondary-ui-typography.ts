/** Study-desk type scale and controls for the Secondary vocabulary portal (--sec-*). */
export const secondaryUi = {
  eyebrow: "text-sm font-extrabold uppercase tracking-wide text-sec-muted",
  eyebrowMuted: "text-sm font-extrabold uppercase tracking-wide text-sec-muted/80",
  pageTitle: "text-2xl font-extrabold leading-snug text-sec-ink sm:text-3xl",
  sectionTitle: "text-xl font-extrabold text-sec-ink",
  cardTitle: "text-lg font-extrabold text-sec-ink",
  body: "text-base font-semibold leading-relaxed text-sec-ink/85",
  bodyMuted: "text-base font-semibold leading-relaxed text-sec-muted",
  bodyLarge: "text-lg font-semibold leading-relaxed text-sec-ink/90",
  caption: "text-sm font-semibold text-sec-muted",
  captionMuted: "text-sm font-semibold leading-snug text-sec-muted/90",
  word: "text-lg font-extrabold leading-tight text-sec-ink",
  wordLarge: "text-2xl font-extrabold leading-tight text-sec-ink",
  stat: "text-2xl font-extrabold tabular-nums text-sec-ink",
  button: "text-base font-extrabold",
  buttonPadding: "px-4 py-2.5",
  btnPrimary:
    "rounded-lg border border-sec-accent bg-sec-accent px-4 py-2.5 text-base font-extrabold text-white hover:bg-sec-accent-hover disabled:cursor-not-allowed disabled:opacity-60",
  btnSecondary:
    "rounded-lg border border-sec-ink/25 bg-white px-4 py-2.5 text-base font-extrabold text-sec-ink hover:bg-sec-panel-muted disabled:cursor-not-allowed disabled:opacity-60",
  input: "text-lg font-semibold text-sec-ink",
  inputPadding: "px-3 py-3",
  inputField:
    "rounded-lg border border-sec-border bg-white px-3 py-3 text-lg font-semibold text-sec-ink",
  select:
    "rounded-lg border border-sec-border bg-white px-3 py-3 text-lg font-semibold text-sec-ink",
  chipMeta: "text-sm font-semibold",
  tag: "text-sm font-extrabold uppercase tracking-wide",
  wordBankChip:
    "rounded-full border border-sec-border bg-white px-3 py-1.5 text-base font-extrabold text-sec-ink",
} as const;
