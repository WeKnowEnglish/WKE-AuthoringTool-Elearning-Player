/**
 * Curated Supabase media URLs for A1 body vocabulary sets.
 * Eye is tagged misc; skip featured banners and duplicate arm/legs plural assets.
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

export const BODY_HUB_COVER_URL =
  `${BASE}/03aec9a0-de32-404c-a711-0f154209d0dc-head.png`;

export const BODY_HEAD_FACE_COVER_URL =
  `${BASE}/03aec9a0-de32-404c-a711-0f154209d0dc-head.png`;

export const BODY_LIMBS_INSIDE_COVER_URL =
  `${BASE}/7347b67e-6c17-4fe5-8d5c-1d05666f71e1-leg.png`;

export const BODY_HEAD_FACE_MEDIA_URLS: Partial<
  Record<
    | "head"
    | "eye"
    | "ear"
    | "nose"
    | "mouth"
    | "lips"
    | "teeth"
    | "cheeks"
    | "neck"
    | "shoulder"
    | "chest"
    | "back"
    | "hand"
    | "finger"
    | "elbow",
    string
  >
> = {
  head: `${BASE}/03aec9a0-de32-404c-a711-0f154209d0dc-head.png`,
  eye: `${BASE}/dabb6133-7acc-4098-84d0-01c915b1ecbd-eye.png`,
  ear: `${BASE}/47041c66-1bb5-4bce-8bf0-2d5d121773aa-ear.png`,
  nose: `${BASE}/2b557c5f-3020-404e-b055-93582fea2264-nose.png`,
  mouth: `${BASE}/80912ace-4689-464d-9499-40da493db583-mouth.png`,
  lips: `${BASE}/45ca78bc-67f5-4048-afea-69034cafb02e-lips.png`,
  teeth: `${BASE}/c802c69b-7eca-41f2-bf8a-5a053b2c7fad-teeth.png`,
  cheeks: `${BASE}/099e5581-6aea-4600-8355-c459831ba5cb-cheeks.png`,
  neck: `${BASE}/a6dc4ca7-c79f-4aaa-abf3-05f4a868d9e8-neck.png`,
  shoulder: `${BASE}/83aabb3d-92c2-4f79-baaa-1de9f6540172-shoulder.png`,
  chest: `${BASE}/9a5b39e7-f5d1-44d0-8ed1-0c75f980b364-chest.png`,
  back: `${BASE}/eab31aca-79fb-4de5-b785-15cc0f4371a8-back.png`,
  hand: `${BASE}/82071e7a-5ff9-4a43-acc6-4b69af5e9563-hand.png`,
  finger: `${BASE}/4d996ac1-f90e-48e4-8c67-777578640e29-finger.png`,
  elbow: `${BASE}/907ac5d0-a438-4b2a-9199-17c85417196a-elbow.png`,
};

export const BODY_LIMBS_INSIDE_MEDIA_URLS: Partial<
  Record<
    | "arm"
    | "leg"
    | "knee"
    | "ankle"
    | "feet"
    | "toes"
    | "stomach"
    | "heart"
    | "bone"
    | "muscle"
    | "cell"
    | "organs",
    string
  >
> = {
  arm: `${BASE}/498a6f22-cfc3-497c-a882-1bc1bb2e7da4-arm.png`,
  leg: `${BASE}/7347b67e-6c17-4fe5-8d5c-1d05666f71e1-leg.png`,
  knee: `${BASE}/2c8c0823-d2ee-4fcd-ba9c-649c16e125f7-knee.png`,
  ankle: `${BASE}/9e3a2734-8c58-42cf-be63-0508539a4d88-ankle.png`,
  feet: `${BASE}/159d9026-f0a7-4662-8b04-968871af5e23-feet.png`,
  toes: `${BASE}/98647812-d494-42ce-a5c1-bad909ad1f65-toes.png`,
  stomach: `${BASE}/4349c328-3f30-4906-b29b-356bf1a4e81d-stomach.png`,
  heart: `${BASE}/57869121-1f45-4dd6-861e-86ae20128bc5-heart.png`,
  bone: `${BASE}/90165995-364c-4bf1-b057-568c5c182cb6-bone.png`,
  muscle: `${BASE}/4a1ed4e1-04f8-4ae5-9a16-f81dc53982de-muscle.png`,
  cell: `${BASE}/28481c49-8097-45e6-b141-2059bb83d325-cell.png`,
  organs: `${BASE}/bc73186b-35b4-4766-baaa-ee7089df0968-organs.png`,
};
