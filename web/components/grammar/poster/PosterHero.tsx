import { POSTER_HERO_FALLBACK, type PosterHeroData } from "./poster-view-model";

type Props = {
  hero?: PosterHeroData;
};

export function PosterHero({ hero = POSTER_HERO_FALLBACK }: Props) {
  return (
    <header className="mb-1 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-kid-ink/70 md:text-base">
        {hero.prefix}
      </p>
      <h1 className="mt-0.5 text-balance text-3xl font-extrabold leading-tight text-kid-ink md:text-4xl">
        <span style={{ color: hero.highlightA.color }}>{hero.highlightA.text}</span>
        <span className="mx-1 text-kid-ink">{hero.middle}</span>
        <span style={{ color: hero.highlightB.color }}>{hero.highlightB.text}</span>
        <span className="mx-1 text-kid-ink">{hero.suffix}</span>
      </h1>
    </header>
  );
}
