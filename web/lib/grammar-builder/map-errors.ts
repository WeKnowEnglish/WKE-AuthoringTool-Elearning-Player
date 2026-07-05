export class GrammarMapError extends Error {
  readonly cardId?: number;

  constructor(message: string, cardId?: number) {
    super(message);
    this.name = "GrammarMapError";
    this.cardId = cardId;
  }
}
