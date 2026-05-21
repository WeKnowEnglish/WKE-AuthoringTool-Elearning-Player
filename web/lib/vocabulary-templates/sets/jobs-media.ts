/**
 * Curated Supabase media URLs for A1 jobs vocabulary sets (jobs + people tags).
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

export const JOBS_HUB_COVER_URL =
  `${BASE}/3ea7aaa0-c21d-472b-9a22-65dc8b8ab920-doctor.png`;

export const JOBS_COMMUNITY_COVER_URL =
  `${BASE}/3ea7aaa0-c21d-472b-9a22-65dc8b8ab920-doctor.png`;

export const JOBS_CREATIVE_COVER_URL =
  `${BASE}/c62dee7e-8f64-438b-b975-19516de0e194-artist.png`;

export const JOBS_COMMUNITY_MEDIA_URLS: Partial<
  Record<
    | "doctor"
    | "nurse"
    | "firefighter"
    | "police"
    | "vet"
    | "teacher"
    | "chef"
    | "pilot"
    | "builder"
    | "mechanic"
    | "librarian"
    | "principal"
    | "waiter"
    | "waitress"
    | "detective",
    string
  >
> = {
  doctor: `${BASE}/3ea7aaa0-c21d-472b-9a22-65dc8b8ab920-doctor.png`,
  nurse: `${BASE}/6a7e5e75-43d4-4a78-9790-4e7476959201-nurse.png`,
  firefighter: `${BASE}/4a1b6208-209f-41cd-8fcc-5c72ccabe4c3-firefighter.png`,
  police: `${BASE}/6f7e2ee5-839c-42f1-9aaa-ccde00211744-police.png`,
  vet: `${BASE}/c51f5c0e-bc02-4729-8434-d9808748a668-vet.png`,
  teacher: `${BASE}/26de27f9-ad01-4ef2-be66-8c160ca35c9f-teacher.png`,
  chef: `${BASE}/902005ca-741c-48b5-b845-0201eedc6d3d-chef.png`,
  pilot: `${BASE}/df2f5e1e-3695-4010-bbdc-a1661c9e3420-pilot.png`,
  builder: `${BASE}/8b406d0f-befb-4bde-9f24-7ed178584e3d-builder.png`,
  mechanic: `${BASE}/b208fe3d-b668-4810-baa7-529efff0f63d-mechanic.png`,
  librarian: `${BASE}/bca7090d-292d-405c-b90c-4c367dd8377e-librarian.png`,
  principal: `${BASE}/acaeb167-7010-43d3-9aa4-4c12f17c5224-principal.png`,
  waiter: `${BASE}/b1bdddda-4339-48f2-82ae-d6463dd6b102-waiter.png`,
  waitress: `${BASE}/a9ee181a-7764-4c2c-80d0-7cb5b2d6bdeb-waitress.png`,
  detective: `${BASE}/8f75b26d-85fb-4a29-917a-7873c2c270c6-detective.png`,
};

export const JOBS_CREATIVE_MEDIA_URLS: Partial<
  Record<
    | "actor"
    | "artist"
    | "clown"
    | "acrobat"
    | "biologist"
    | "electrician"
    | "zookeeper"
    | "banker"
    | "reporter"
    | "computer_programmer"
    | "actress",
    string
  >
> = {
  actor: `${BASE}/9359b578-ba65-4a57-8a47-0f4b5d694c58-actor.png`,
  artist: `${BASE}/c62dee7e-8f64-438b-b975-19516de0e194-artist.png`,
  clown: `${BASE}/75d16e5d-caa7-4e49-a377-a6ad0052a701-clown.png`,
  acrobat: `${BASE}/ad4e0e77-2d88-4207-a19b-ec2c2395f366-acrobat.png`,
  biologist: `${BASE}/8cefb537-e8a6-425f-9f05-9360e00e6e59-biologist.png`,
  electrician: `${BASE}/1590869c-dca1-4a49-870e-9a293e6f259d-electrician.png`,
  zookeeper: `${BASE}/1b3922ca-4cd7-414e-965c-9e078fbfd922-zookeeper.png`,
  banker: `${BASE}/90315976-12c2-4764-9c79-3c132ac6f84c-banker.png`,
  reporter: `${BASE}/5382ec21-e485-4211-b9c9-a523fcd049a6-reporter.png`,
  computer_programmer: `${BASE}/4c4c7cce-5a53-4f81-bee6-dc9789397385-computer_programmer.png`,
  actress: `${BASE}/0d1b8d4c-e8a6-4e86-adaa-6bbcaabddf4b-actress.png`,
};
