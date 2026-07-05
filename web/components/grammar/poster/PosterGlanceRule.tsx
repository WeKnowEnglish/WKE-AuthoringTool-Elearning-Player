type Props = {
  text: string;
  highlight?: string;
};

function highlightText(text: string, highlight?: string) {
  if (!highlight || !text.includes(highlight)) {
    return text;
  }
  const [before, after] = text.split(highlight);
  return (
    <>
      {before}
      <strong className="font-extrabold">{highlight}</strong>
      {after}
    </>
  );
}

export function PosterGlanceRule({ text, highlight }: Props) {
  return (
    <p className="mb-2 text-balance text-xl font-extrabold leading-snug text-kid-ink md:text-2xl">
      {highlightText(text, highlight)}
    </p>
  );
}
