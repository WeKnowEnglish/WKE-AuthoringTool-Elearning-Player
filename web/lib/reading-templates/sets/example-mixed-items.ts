import {
  readingParkSceneSvgDataUrl,
  readingSquareSvgDataUrl,
} from "../reading-placeholder-svg";
import type { ReadingSetDefinition } from "../types";

function itemImage(lemma: string, colorHex: string): string {
  return readingSquareSvgDataUrl({ fillHex: colorHex, label: lemma });
}

/**
 * Sample reading set: five category anchors with colored-square placeholders.
 * Replace imageUrl per slot when photos are uploaded.
 */
export const READING_MIXED_ITEMS: ReadingSetDefinition = {
  id: "reading_mixed_items",
  title: "Reading practice",
  coverImageUrl: readingParkSceneSvgDataUrl(),
  items: [
    {
      id: "animal",
      category: "animal",
      lemma: "dog",
      colorName: "red",
      colorHex: "#ef4444",
      imageUrl: itemImage("dog", "#ef4444"),
    },
    {
      id: "toy",
      category: "toy",
      lemma: "ball",
      colorName: "blue",
      colorHex: "#3b82f6",
      imageUrl: itemImage("ball", "#3b82f6"),
    },
    {
      id: "fruit",
      category: "fruit",
      lemma: "apple",
      colorName: "green",
      colorHex: "#22c55e",
      imageUrl: itemImage("apple", "#22c55e"),
    },
    {
      id: "food",
      category: "food",
      lemma: "sandwich",
      colorName: "yellow",
      colorHex: "#eab308",
      imageUrl: itemImage("sandwich", "#eab308"),
    },
    {
      id: "clothes",
      category: "clothes",
      lemma: "shirt",
      colorName: "purple",
      colorHex: "#a855f7",
      imageUrl: itemImage("shirt", "#a855f7"),
    },
  ],
  generalTrueFalse: [
    { itemId: "animal", statement: "A dog is an animal.", correct: true },
    { itemId: "toy", statement: "An apple is a toy.", correct: false },
    { itemId: "fruit", statement: "An apple is a fruit.", correct: true },
    { itemId: "food", statement: "A sandwich is food.", correct: true },
    { itemId: "clothes", statement: "A shirt is a fruit.", correct: false },
  ],
  pictureTrueFalse: [
    { itemId: "animal", statement: "This square is red.", correct: true },
    { itemId: "toy", statement: "This square is blue.", correct: true },
    { itemId: "fruit", statement: "This square is red.", correct: false },
    { itemId: "food", statement: "This square is yellow.", correct: true },
    { itemId: "clothes", statement: "This square is blue.", correct: false },
  ],
  cloze: {
    template:
      "We went to the __1__. My friend has a __2__. We ate an __3__ on the grass. I wore my __4__. The __5__ square is on the table.",
    blanks: [
      { id: "1", acceptable: ["park", "Park"] },
      { id: "2", acceptable: ["ball", "Ball"] },
      { id: "3", acceptable: ["apple", "Apple"] },
      { id: "4", acceptable: ["shirt", "Shirt"] },
      { id: "5", acceptable: ["blue", "Blue"] },
    ],
    wordBank: ["park", "ball", "apple", "shirt", "blue", "dog", "sandwich", "red"],
    heroImageUrl: readingParkSceneSvgDataUrl(),
  },
  shortAnswers: [
    { itemId: "animal", prompt: "This square is ___.", acceptable_answers: ["red", "Red"] },
    { itemId: "toy", prompt: "This is a ___.", acceptable_answers: ["ball", "Ball"] },
    {
      itemId: "fruit",
      prompt: "An apple is a ___.",
      acceptable_answers: ["fruit", "Fruit", "apple", "Apple"],
    },
    { itemId: "food", prompt: "We play at the ___.", acceptable_answers: ["park", "Park"] },
    {
      itemId: "toy",
      prompt: "The ball on the table is ___.",
      acceptable_answers: ["blue", "Blue"],
    },
  ],
};
