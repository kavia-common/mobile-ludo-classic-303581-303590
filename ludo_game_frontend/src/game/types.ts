export type PlayerId = "red" | "green" | "yellow" | "blue";

export type PlayerConfig = {
  id: PlayerId;
  name: string;
  color: string; // display color
  isActive: boolean;
};

export type TokenId = 0 | 1 | 2 | 3;

export type TokenState = {
  id: TokenId;
  /** null means in yard (not entered track yet). */
  step: number | null;
  /** once token reaches home (finished) */
  isFinished: boolean;
};

export type GameStatus = "setup" | "playing" | "finished";

export type GameState = {
  version: 1;
  status: GameStatus;
  players: PlayerConfig[];
  currentPlayerIndex: number;
  tokens: Record<PlayerId, TokenState[]>;
  dice: {
    value: number | null;
    isRolling: boolean;
  };
  /** Moves available for the current dice. */
  legalMoves: MoveOption[];
  /** Lightweight feed for UX hints. */
  log: string[];
  /** Winner player id once finished */
  winner: PlayerId | null;
};

export type MoveOption = {
  playerId: PlayerId;
  tokenId: TokenId;
  /** next step after move; null never used here */
  toStep: number;
  /** whether a capture will happen by landing on a capturable opponent token */
  willCapture: boolean;
  /** opponent tokens captured (0..n) */
  captures: { playerId: PlayerId; tokenId: TokenId }[];
  /** whether this move finishes the token */
  finishesToken: boolean;
};

/**
 * Board geometry for a simplified-but-classic Ludo ruleset:
 * - Track has 52 steps (0..51)
 * - Each player has an entry index and then a home stretch of 6 steps (52..57)
 * - Total "distance" to finish: 57 steps from first entry move to final home cell.
 */
export const TRACK_LEN = 52;
export const HOME_STRETCH_LEN = 6;
/** Steps 0..51 track, 52..57 home stretch cells (57 is final). */
export const FINAL_STEP = TRACK_LEN + HOME_STRETCH_LEN - 1; // 57

export const PLAYER_ORDER: PlayerId[] = ["red", "green", "yellow", "blue"];

/**
 * Approximate classic entry indices on a 52-step loop.
 * These correspond to the 4 corners in clockwise order.
 */
export const ENTRY_INDEX: Record<PlayerId, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/**
 * Safe cells (stars) on the shared track where captures cannot happen.
 * Common safe indices: 0, 8, 13, 21, 26, 34, 39, 47
 * Note: also includes each player's entry index by construction.
 */
export const SAFE_TRACK_STEPS = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

export function isPlayerId(v: unknown): v is PlayerId {
  return v === "red" || v === "green" || v === "yellow" || v === "blue";
}
