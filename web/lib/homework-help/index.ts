export type {
  HelpAction,
  HelpLevel,
  HelpStep,
  HelpStruggle,
} from "@/lib/homework-help/types";
export {
  HELP_LEVELS,
  HELP_WRONG_CHECK_THRESHOLDS,
  helpLevelFromWrongChecks,
  helpLevelIndex,
  maxHelpLevel,
  nextHelpLevel,
  resolveUnlockedHelpLevel,
} from "@/lib/homework-help/types";
export {
  advancePictureClozeHelp,
  emptyHelpStruggle,
  getPictureClozeHelpStep,
  pictureClozeScaffoldBankFilter,
  pictureClozeScaffoldFirstLetter,
  recordPictureClozeWrongCheck,
  type PictureClozeHelpInput,
} from "@/lib/homework-help/picture-cloze";
