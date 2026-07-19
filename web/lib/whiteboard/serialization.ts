import type {
  SerializedBoardDocument,
  WhiteboardElement,
} from "@/lib/whiteboard/domain";

export type PlainBoardSnapshot = {
  id: string;
  ownerType: SerializedBoardDocument["ownerType"];
  ownerId: string;
  status: SerializedBoardDocument["status"];
  revision: number;
  submittedAt: number | null;
  elements: Record<string, WhiteboardElement>;
  zOrder: string[];
};

export function serializeBoard(board: PlainBoardSnapshot): SerializedBoardDocument {
  const elements = board.zOrder
    .map((id) => board.elements[id])
    .filter((el): el is WhiteboardElement => el != null);

  // Include orphans not in zOrder
  for (const [id, el] of Object.entries(board.elements)) {
    if (!board.zOrder.includes(id)) elements.push(el);
  }

  return {
    id: board.id,
    ownerType: board.ownerType,
    ownerId: board.ownerId,
    status: board.status,
    revision: board.revision,
    elements,
    zOrder: board.zOrder,
  };
}

export function boardDocumentToJson(doc: SerializedBoardDocument): string {
  return JSON.stringify(doc);
}

export function boardDocumentFromJson(json: string): SerializedBoardDocument {
  return JSON.parse(json) as SerializedBoardDocument;
}
