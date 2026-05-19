export type StickerBookBackground = {
  id: string;
  url: string;
  label: string;
};

export type PlacedSticker = {
  instanceId: string;
  stickerId: string;
  xPercent: number;
  yPercent: number;
  scale: number;
};

export type StickerSceneState = {
  backgroundUrl: string;
  placements: PlacedSticker[];
};
