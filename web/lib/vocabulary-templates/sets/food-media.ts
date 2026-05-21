/**
 * Curated Supabase media URLs for A1 food vocabulary sets.
 * breakfast_food re-exports cover URLs from here via breakfast-food-media.ts.
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

export const FOOD_HUB_COVER_URL =
  `${BASE}/9c8dade9-a589-430c-a952-e8d99eef1c8a-Food_Spelling_Cover.png`;

export const BREAKFAST_FOOD_COVER_URL = FOOD_HUB_COVER_URL;

export const FOOD_FRUIT_COVER_URL =
  `${BASE}/12b91b21-489c-465e-a279-8f50ffd090df-apple.png`;

export const FOOD_MEALS_COVER_URL =
  `${BASE}/59e35b87-d8be-4bef-90af-1e4aa5d1eeed-sandwich.png`;

export const FOOD_SNACKS_COVER_URL =
  `${BASE}/1c5dc480-c29d-4fe7-8311-1306b679f8ed-cookies.png`;

export const BREAKFAST_FOOD_MEDIA_URLS: Partial<
  Record<
    | "bread"
    | "milk"
    | "juice"
    | "water"
    | "coffee"
    | "tea"
    | "eggs"
    | "pancakes"
    | "jam"
    | "cereal"
    | "noodles"
    | "ham"
    | "yogurt"
    | "water",
    string
  >
> = {
  bread: `${BASE}/e17ed735-4459-4624-9e8a-78aea28c7e89-bread.png`,
  milk: `${BASE}/2757fff1-d86a-4682-8297-3d7bbd00bdc0-milk.png`,
  juice: `${BASE}/a7e25de6-6858-4850-99ee-e157234b6ef0-juice.png`,
  water: `${BASE}/d6b5d2ac-5003-4100-b26b-cea183f837ec-water.png`,
  eggs: `${BASE}/cb0300fa-2a7c-43a6-aa00-c5f3196984de-egg.png`,
  pancakes: `${BASE}/0fa6e674-b74f-41a0-bd61-3ecd6057ff84-pancakes.png`,
  jam: `${BASE}/02c009b4-c3ad-49a4-890b-c9af9faaf941-jam.png`,
  noodles: `${BASE}/dc53ccad-8a39-48d5-b620-e7b39b44a9fa-noodles.png`,
  ham: `${BASE}/73e78c07-f5c1-40ed-b9f7-163042cf9cd9-ham.png`,
  yogurt: `${BASE}/5c36a321-cfcb-4e34-a0a2-2f4e95a2b504-yogurt.png`,
};

export const FOOD_FRUIT_MEDIA_URLS: Partial<
  Record<
    | "apple"
    | "banana"
    | "orange"
    | "grapes"
    | "strawberry"
    | "pear"
    | "fruit",
    string
  >
> = {
  apple: `${BASE}/12b91b21-489c-465e-a279-8f50ffd090df-apple.png`,
  banana: `${BASE}/32be870f-3d39-427e-a2a2-7ee130a5ece3-bananas.png`,
  orange: `${BASE}/fe9f174d-d973-4920-81ac-09907e08e911-orange.png`,
  grapes: `${BASE}/c9882fc3-c55f-40a4-91fe-9cf711629c56-grapes.png`,
  strawberry: `${BASE}/7c076041-a1a8-48c3-8625-6355ca898f75-strawberry.png`,
  pear: `${BASE}/d76499ee-989b-4394-87f2-1fb1b320d03b-pear.png`,
  fruit: `${BASE}/939e1ace-6100-4636-9e82-ab038244e2c7-fruit.png`,
};

export const FOOD_MEALS_MEDIA_URLS: Partial<
  Record<
    | "sandwich"
    | "pizza"
    | "hamburger"
    | "hotdog"
    | "taco"
    | "spaghetti"
    | "salad"
    | "soup"
    | "rice"
    | "meat"
    | "cheese"
    | "potato"
    | "french_fries"
    | "lettuce"
    | "tomato"
    | "carrot"
    | "noodles",
    string
  >
> = {
  sandwich: `${BASE}/59e35b87-d8be-4bef-90af-1e4aa5d1eeed-sandwich.png`,
  pizza: `${BASE}/06893e36-20f7-46fe-8efb-7ca863023e4d-pizza.png`,
  hamburger: `${BASE}/26d55c1f-753d-424e-835c-cc009b7f156c-hamburger.png`,
  hotdog: `${BASE}/d1a1a92c-7c29-4352-bfde-2eb14aedb2ea-hotdog.png`,
  taco: `${BASE}/c51a057a-59ca-40e8-89ce-bd1bebf2e7e3-taco.png`,
  spaghetti: `${BASE}/9bf075a9-2857-4913-96f2-4ed5fa5a2916-spaghetti.png`,
  salad: `${BASE}/6e245052-2490-4aeb-ada5-fa6b7e3748d5-salad.png`,
  soup: `${BASE}/238c7430-466d-4eba-a591-9b6c06fc2c04-soup.png`,
  rice: `${BASE}/94169301-1d0d-4f0b-b712-4eb32f53df01-rice.png`,
  meat: `${BASE}/50f758a1-9909-4082-8d15-be84312e4097-meat.png`,
  cheese: `${BASE}/55c94b7d-69f0-47f5-bcdc-c80c3d8493f8-cheese.png`,
  potato: `${BASE}/91223c45-61bc-494a-8d84-c83c906617f9-potato.png`,
  french_fries: `${BASE}/19d60ae0-2383-4e3f-a1fa-fc0fac840c46-French_fries.png`,
  lettuce: `${BASE}/67a8ab11-4ef3-4fb1-a160-2b5f96346238-lettuce.png`,
  tomato: `${BASE}/2aff398d-4030-4310-9681-a157b4650895-tomato.png`,
  carrot: `${BASE}/6f60c835-af25-4eee-b34c-98392aa1b21b-carrot.png`,
  noodles: `${BASE}/dc53ccad-8a39-48d5-b620-e7b39b44a9fa-noodles.png`,
};

export const FOOD_SNACKS_MEDIA_URLS: Partial<
  Record<
    | "popcorn"
    | "chips"
    | "nuts"
    | "chocolate_bar"
    | "cookies"
    | "cake"
    | "ice_cream"
    | "donut"
    | "cupcake"
    | "honey",
    string
  >
> = {
  popcorn: `${BASE}/7f97101c-1683-4f94-bb96-751aac4545e2-popcorn.png`,
  chips: `${BASE}/b5815bc8-bf6c-467d-8942-a275da3d746b-chips.png`,
  nuts: `${BASE}/23262231-5227-4d7e-96a2-5f02cb581177-nuts.png`,
  chocolate_bar: `${BASE}/80f8fb91-c985-4078-af59-039a62983977-chocolate_bar.png`,
  cookies: `${BASE}/1c5dc480-c29d-4fe7-8311-1306b679f8ed-cookies.png`,
  cake: `${BASE}/e5c1b73e-4f59-4c43-b550-19508dd7b159-cake.png`,
  ice_cream: `${BASE}/dbd30b7b-ae37-4426-9ee0-5faaa3c5733d-ice_cream.png`,
  donut: `${BASE}/aa65422e-b7b1-48dd-8d1f-c0e412d38671-donut.png`,
  cupcake: `${BASE}/8a66f5d3-bebb-4196-b131-4e7266c1e6c5-cupcake.png`,
  honey: `${BASE}/e1fa8eed-0311-4234-b8e5-9985b5725d06-honey.png`,
};
