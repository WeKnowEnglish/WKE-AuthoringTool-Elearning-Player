/**
 * Curated Supabase media URLs for A1 animal vocabulary sets and the animals quiz topic.
 * Populated from media library metadata (2026-05-20).
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

/** Animals topic cover (matches test-start `animals` quiz topic). */
export const ANIMALS_HUB_COVER_URL = `${BASE}/4eccbb91-f795-4fa4-9f2c-0181b07dd52c-Cover.png`;

export const WILD_ANIMALS_COVER_URL =
  "https://placehold.co/960x540/166534/fefce8?text=Wild+Animals";

export const PETS_COVER_URL = "https://placehold.co/960x540/be185d/fdf2f8?text=Pets";

export const SEA_ANIMALS_COVER_URL =
  "https://placehold.co/960x540/0369a1/f0f9ff?text=Sea+Animals";

export const FARM_ANIMALS_COVER_URL =
  "https://placehold.co/960x540/854d0e/fffbeb?text=Farm+Animals";

export const WILD_ANIMALS_MEDIA_URLS: Partial<
  Record<
    | "lion"
    | "tiger"
    | "zebra"
    | "monkey"
    | "bear"
    | "wolf"
    | "elephant"
    | "giraffe"
    | "panda"
    | "camel"
    | "deer"
    | "parrot"
    | "cheetah"
    | "rhino"
    | "hippo",
    string
  >
> = {
  lion: `${BASE}/c4781758-afbb-4703-9d5c-15143c59b63d-lion.png`,
  tiger: `${BASE}/b1b3f5ee-c6b3-487b-b021-b42d839e8433-tiger.png`,
  monkey: `${BASE}/7f542b30-fb2a-41df-89ae-616d241f5472-monkey.png`,
  bear: `${BASE}/68ed0fe7-65a0-4c6a-a8e1-db298fb942d9-bear.png`,
  elephant: `${BASE}/047776cf-a4db-4a09-866f-0dc10af07b78-elephant.png`,
  giraffe: `${BASE}/670957fd-adf3-4346-8a5c-a5216d7af308-giraffe.png`,
  panda: `${BASE}/92e8ba11-d71d-4840-933f-f54309ba2a5b-panda.png`,
  camel: `${BASE}/e70649f1-e562-484b-99c1-09ebc118dce5-camel.png`,
  deer: `${BASE}/180c1e22-1d28-4790-b421-66b707131059-deer.png`,
  parrot: `${BASE}/c53006f8-1f23-435b-8728-fcd8da027a0d-parrot.png`,
  cheetah: `${BASE}/65b487ff-a7a2-4076-9b7c-2f305a99a2e7-cheetah.png`,
  rhino: `${BASE}/e819ab58-1c75-486b-966e-0efb60a24147-rhino.png`,
  hippo: `${BASE}/b405468b-546c-447c-8204-7361cc0c7d64-hippo.png`,
};

export const PETS_MEDIA_URLS: Partial<
  Record<
    | "cat"
    | "dog"
    | "goldfish"
    | "rabbit"
    | "hamster"
    | "bird"
    | "turtle"
    | "frog"
    | "snake"
    | "lizard"
    | "mouse"
    | "gecko"
    | "guinea_pig"
    | "iguana"
    | "snail",
    string
  >
> = {
  cat: `${BASE}/2dd607bb-1097-4644-93a9-03aba0f7807e-cat.png`,
  dog: `${BASE}/25a98c5b-53c0-499a-b251-e128a2893694-dog.png`,
  rabbit: `${BASE}/14911bbd-828f-4401-b96e-1c6ee1c7d34e-rabbit.png`,
  hamster: `${BASE}/8dda182f-6a61-4552-aba2-e557f82f86a6-hamster.png`,
  bird: `${BASE}/d82033e2-fa73-4fbc-bf87-15d183fe34e2-bird.png`,
  turtle: `${BASE}/1edeb5c9-f79c-4617-8a8c-bc7d6ef4adbd-turtle.png`,
  frog: `${BASE}/5a28031e-fd3c-4384-b5c7-22ddfd40bc35-frog.png`,
  snake: `${BASE}/57e0c5b0-4d4c-4431-b232-6322ce303067-snake.png`,
  lizard: `${BASE}/1f6f7246-38d4-44af-a2e1-1592a3b764e6-lixzard.png`,
  mouse: `${BASE}/d9d037d1-0297-4ab0-a6e1-268f92302cbb-mouse.png`,
  iguana: `${BASE}/110cfd1c-4026-420e-8944-db50b0eebda4-iguana.png`,
};

export const SEA_ANIMALS_MEDIA_URLS: Partial<
  Record<
    | "dolphin"
    | "shark"
    | "whale"
    | "fish"
    | "octopus"
    | "crab"
    | "lobster"
    | "seal"
    | "jellyfish"
    | "seahorse"
    | "starfish"
    | "stingray"
    | "otter"
    | "walrus",
    string
  >
> = {
  dolphin: `${BASE}/73c1bdf3-33a6-4655-afd1-9ad09223a2c2-dolphin.png`,
  shark: `${BASE}/0c4e2b39-305a-492c-b825-1cbacb77e2ca-shark.png`,
  whale: `${BASE}/2e61f70f-0cf5-4f36-90fb-9d33adb4a536-whale.png`,
  fish: `${BASE}/cff635a6-83ac-485e-9eff-42a17b2aedbc-fish.png`,
  octopus: `${BASE}/d35e9cd4-690a-4b65-9b9b-58e0078bda44-octopus.png`,
  crab: `${BASE}/726f9aa4-e089-4616-972a-d434f81a055a-crab.png`,
  lobster: `${BASE}/77cf374e-d280-4c66-b48a-d1b04043f60a-lobster.png`,
  seal: `${BASE}/6e4e9221-7932-41ea-afdc-e0307a661827-seal.png`,
  jellyfish: `${BASE}/5d739f89-701b-43cf-8af2-389b6c50ee1b-jellyfish.png`,
  seahorse: `${BASE}/a54d07b6-2eca-41e2-8aec-f68a0b4070dd-seahorse.png`,
  starfish: `${BASE}/bf4db501-9789-4c0d-91fb-c76fc1db81a4-starfish.png`,
  stingray: `${BASE}/1b484ad9-2826-43c3-b1b5-f973dad9e3ea-stingray.png`,
  otter: `${BASE}/1ac8af3a-23a3-43b7-ae20-752dd0d8aa80-otter.png`,
  walrus: `${BASE}/58c27880-5ae2-423d-b3cb-0881f366a722-walrus.png`,
};

export const FARM_ANIMALS_MEDIA_URLS: Partial<
  Record<
    | "pig"
    | "cow"
    | "sheep"
    | "goat"
    | "chicken"
    | "duck"
    | "horse"
    | "donkey"
    | "rooster"
    | "chick"
    | "buffalo"
    | "bull"
    | "lamb"
    | "goose"
    | "turkey",
    string
  >
> = {
  chicken: `${BASE}/9d25ad38-a2fe-43e2-9bf4-fd2b5eea62e5-chicken.png`,
  duck: `${BASE}/e84ce369-3e7e-4717-ae93-d9316a8f4265-duck.png`,
  buffalo: `${BASE}/1e3eeaff-0051-4997-b014-4b7243ed6d34-buffalo.png`,
};
