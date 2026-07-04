/** Manual source rectangle inside the sprite sheet (pixels). */
export type SpriteRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/** Alias used by renderers and domain lookups. */
export type SpriteFrame = SpriteRect;

export type SpriteCategory =
  | "grass"
  | "soil"
  | "plant"
  | "item"
  | "weed"
  | "fence";

/** Catalog entry used by preview tools and future map editors. */
export type SpriteFrameDef = SpriteRect & {
  id: string;
  label: string;
  category: SpriteCategory;
};

export type SpriteAtlasAssetMap = Record<string, SpriteRect>;

export type SpriteAtlasConfig = {
  imageSrc: string;
  width: number;
  height: number;
  assets: SpriteAtlasAssetMap;
};
