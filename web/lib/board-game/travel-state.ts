export type TravelHop = {
  playerIndex: number;
  fromPathIndex: number;
  toPathIndex: number;
  hopKey: number;
  mode: "hop" | "jump";
};
