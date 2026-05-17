/** Hardcoded demo for test-start overlay; lesson screens use payload from DB. */
export const WORD_BUCKET_CATCH_DEMO = {
  target_word: "ball",
  /** Catch this many correct images to win. */
  required_correct_catches: 5,
  fall_speed_px_per_sec: 155,
  spawn_interval_ms: 1350,
  item_size_px: 56,
  bucket_width_px: 88,
  bucket_height_px: 52,
  choices: [
    { id: "ball", image_url: "/listen-color-objects/ball.svg", correct: true },
    { id: "car", image_url: "/listen-color-objects/car.svg", correct: false },
    { id: "cup", image_url: "/listen-color-objects/cup.svg", correct: false },
    { id: "bird", image_url: "/listen-color-objects/bird.svg", correct: false },
    { id: "box", image_url: "/listen-color-objects/box.svg", correct: false },
  ],
} as const;
