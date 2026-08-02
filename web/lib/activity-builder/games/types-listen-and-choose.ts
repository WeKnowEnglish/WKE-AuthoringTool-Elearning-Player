/** Studio Games · Listen and choose (LP subtype listen_and_choose). */

export type GamesListenChoice = {
  id: string;
  imageUrl: string;
  label?: string;
};

export type GamesListenAndChooseItem = {
  id: string;
  bodyText?: string;
  dialogText: string;
  promptAudioUrl?: string;
  imageFit?: "cover" | "contain";
  autoPlay?: boolean;
  shuffleChoices?: boolean;
  choices: GamesListenChoice[];
  correctChoiceId: string;
};

export type GamesListenAndChooseInteraction = {
  type: "games";
  format: "listen_and_choose";
  quizGroupId: string;
  quizGroupTitle: string;
  bodyTextDefault: string;
  autoPlayDefault: boolean;
  shuffleChoicesDefault: boolean;
  items: GamesListenAndChooseItem[];
};

export type GamesListenAndChooseAuthoringDocument = {
  version: 1;
  kind: "activity-authoring";
  id: string;
  name: string;
  educationalIntent: {
    objective: string;
    successCriteria: string;
    cefr?: string;
    vocabulary?: string[];
  };
  content: {
    instruction?: string;
    completionMessage?: string;
  };
  interaction: GamesListenAndChooseInteraction;
};
