export interface PracticeCase {
  id: string;
  situation: string;
  updatedAt: string;
}

export interface Turn {
  id: string;
  parentId: string | null;
  reply: string | null;
  counterpart: string;
}

export function conversation(turns: Turn[], end: string | null) {
  const byId = new Map(turns.map(turn => [turn.id, turn]));
  const path: Turn[] = [];
  let turn = end ? byId.get(end) : undefined;
  while (turn) {
    path.push(turn);
    turn = turn.parentId ? byId.get(turn.parentId) : undefined;
  }
  return path.reverse();
}
