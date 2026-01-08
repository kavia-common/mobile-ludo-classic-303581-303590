import {
  ENTRY_INDEX,
  FINAL_STEP,
  PLAYER_ORDER,
  SAFE_TRACK_STEPS,
  TRACK_LEN,
  type GameState,
  type MoveOption,
  type PlayerConfig,
  type PlayerId,
  type TokenId,
  type TokenState,
} from "./types";

/** Public helper to create initial tokens array. */
function createTokens(): TokenState[] {
  return [
    { id: 0, step: null, isFinished: false },
    { id: 1, step: null, isFinished: false },
    { id: 2, step: null, isFinished: false },
    { id: 3, step: null, isFinished: false },
  ];
}

/** Compute relative distance traveled from entry for a token. */
function stepToDistanceFromEntry(playerId: PlayerId, step: number): number {
  if (step >= TRACK_LEN) {
    // already in home stretch: distance is TRACK_LEN + (homeStretchIndex+1)
    return TRACK_LEN + (step - TRACK_LEN) + 1;
  }
  const entry = ENTRY_INDEX[playerId];
  const diff = (step - entry + TRACK_LEN) % TRACK_LEN;
  return diff + 1;
}

/**
 * Convert distance traveled (1..57) back to absolute step value.
 * distance=1 => entry step on the shared track.
 * distance=52 => last shared track step before entering home stretch.
 * distance=53..57 => home stretch steps 52..56? We map to 52..57 with FINAL at 57.
 */
function distanceToStep(playerId: PlayerId, distance: number): number {
  if (distance <= TRACK_LEN) {
    const entry = ENTRY_INDEX[playerId];
    return (entry + (distance - 1)) % TRACK_LEN;
  }
  // home stretch
  const homeIndex = distance - TRACK_LEN - 1; // 0..5
  return TRACK_LEN + homeIndex; // 52..57? Actually 52..57 with homeIndex 0..5 => 52..57? (TRACK_LEN=52) => 52..57
}

/** Returns true if an absolute step is on the shared track. */
function isOnSharedTrack(step: number): boolean {
  return step >= 0 && step < TRACK_LEN;
}

/** Tokens on the same absolute shared-track step collide. Home stretch is private. */
function tokensAtSharedStep(state: GameState, absoluteStep: number): { playerId: PlayerId; tokenId: TokenId }[] {
  const out: { playerId: PlayerId; tokenId: TokenId }[] = [];
  for (const p of PLAYER_ORDER) {
    for (const t of state.tokens[p]) {
      if (t.step !== null && !t.isFinished && isOnSharedTrack(t.step) && t.step === absoluteStep) {
        out.push({ playerId: p, tokenId: t.id });
      }
    }
  }
  return out;
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

// PUBLIC_INTERFACE
export function createInitialGameState(players: PlayerConfig[]): GameState {
  /** This is a public function. Creates a fresh game state for 2-4 players. */
  const activePlayers = players.filter((p) => p.isActive);
  const tokens = {
    red: createTokens(),
    green: createTokens(),
    yellow: createTokens(),
    blue: createTokens(),
  } as GameState["tokens"];

  return {
    version: 1,
    status: "playing",
    players: activePlayers,
    currentPlayerIndex: 0,
    tokens,
    dice: { value: null, isRolling: false },
    legalMoves: [],
    log: ["Game started."],
    winner: null,
  };
}

// PUBLIC_INTERFACE
export function computeLegalMoves(state: GameState): MoveOption[] {
  /** This is a public function. Computes legal moves for current player based on dice value. */
  const dice = state.dice.value;
  if (!dice || state.status !== "playing") return [];

  const player = state.players[state.currentPlayerIndex];
  const pid = player.id;

  const moves: MoveOption[] = [];

  for (const token of state.tokens[pid]) {
    if (token.isFinished) continue;

    // If token is in yard, only enter on 6.
    if (token.step === null) {
      if (dice === 6) {
        const toStep = ENTRY_INDEX[pid]; // enter at entry index
        // landing on shared track may capture if not safe and not blocked by multiple tokens (we simplify: can capture any single/multiple enemy tokens there if not safe)
        const captures = computeCapturesForLanding(state, pid, toStep);
        moves.push({
          playerId: pid,
          tokenId: token.id,
          toStep,
          willCapture: captures.length > 0,
          captures,
          finishesToken: false,
        });
      }
      continue;
    }

    // Token is on board: move forward dice steps but cannot overshoot final step.
    const currentDistance = stepToDistanceFromEntry(pid, token.step);
    const nextDistance = currentDistance + dice;
    if (nextDistance > FINAL_STEP + 1) {
      // cannot move beyond final
      continue;
    }
    const toStep = nextDistance === FINAL_STEP + 1 ? FINAL_STEP : distanceToStep(pid, nextDistance);

    const finishesToken = nextDistance === FINAL_STEP + 1 || toStep === FINAL_STEP;
    // Captures only on shared track.
    const captures = isOnSharedTrack(toStep) ? computeCapturesForLanding(state, pid, toStep) : [];
    moves.push({
      playerId: pid,
      tokenId: token.id,
      toStep,
      willCapture: captures.length > 0,
      captures,
      finishesToken,
    });
  }

  // Disallow moving onto your own token stack in home stretch beyond final? Simplify: allow.
  // Also disallow capturing on safe cells:
  return moves.filter((m) => {
    if (!isOnSharedTrack(m.toStep)) return true;
    if (SAFE_TRACK_STEPS.has(m.toStep)) return m.captures.length === 0;
    return true;
  });
}

function computeCapturesForLanding(state: GameState, mover: PlayerId, landingStep: number): { playerId: PlayerId; tokenId: TokenId }[] {
  if (SAFE_TRACK_STEPS.has(landingStep)) return [];
  const occupants = tokensAtSharedStep(state, landingStep);
  // If any enemy tokens present, capture them (classic sometimes has "block" with 2 tokens; omitted here).
  return occupants.filter((o) => o.playerId !== mover);
}

// PUBLIC_INTERFACE
export function applyMove(state: GameState, move: MoveOption): GameState {
  /** This is a public function. Applies a move and returns the next game state (including captures and win check). */
  const next = cloneState(state);
  if (next.status !== "playing") return next;

  const player = next.players[next.currentPlayerIndex];
  if (player.id !== move.playerId) return next;

  const token = next.tokens[move.playerId].find((t) => t.id === move.tokenId);
  if (!token || token.isFinished) return next;

  // Move token
  token.step = move.toStep;

  // Finish token if needed: treat FINAL_STEP as the final home cell.
  if (move.finishesToken || token.step === FINAL_STEP) {
    token.isFinished = true;
    token.step = FINAL_STEP;
  }

  // Apply captures (send captured tokens back to yard)
  for (const c of move.captures) {
    const captured = next.tokens[c.playerId].find((t) => t.id === c.tokenId);
    if (captured && captured.step !== null && !captured.isFinished) {
      captured.step = null;
    }
  }

  // Log
  const capText =
    move.captures.length > 0 ? ` Captured ${move.captures.length} token${move.captures.length > 1 ? "s" : ""}.` : "";
  const finishText = token.isFinished ? " Finished a token." : "";
  next.log = [`${player.name} moved token ${move.tokenId + 1}.${capText}${finishText}`, ...next.log].slice(0, 8);

  // Clear dice & moves for next phase
  next.dice.value = null;
  next.legalMoves = [];

  // Check win
  const allFinished = next.tokens[player.id].every((t) => t.isFinished);
  if (allFinished) {
    next.status = "finished";
    next.winner = player.id;
    next.log = [`${player.name} wins!`, ...next.log].slice(0, 8);
    return next;
  }

  // Turn progression:
  // - If dice was 6, player gets another turn, unless no move? (We handle "no move" in advanceTurn.)
  // Here: decide turn in caller based on previous dice; store lastDice? We don't keep it, so caller should.
  return next;
}

// PUBLIC_INTERFACE
export function advanceTurn(state: GameState, previousDice: number | null, hadAnyMove: boolean): GameState {
  /** This is a public function. Advances to next player, honoring an extra turn on 6 if a move was possible. */
  const next = cloneState(state);
  if (next.status !== "playing") return next;

  // If rolled 6 and had a legal move, keep same player.
  const extraTurn = previousDice === 6 && hadAnyMove;

  if (!extraTurn) {
    next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
  }
  return next;
}

// PUBLIC_INTERFACE
export function canRollDice(state: GameState): boolean {
  /** This is a public function. True if the player can roll now (no dice value waiting and game in progress). */
  return state.status === "playing" && !state.dice.isRolling && state.dice.value === null;
}

// PUBLIC_INTERFACE
export function withDiceValue(state: GameState, value: number): GameState {
  /** This is a public function. Sets dice value and computes legal moves. */
  const next = cloneState(state);
  next.dice.value = value;
  const moves = computeLegalMoves(next);
  next.legalMoves = moves;

  const player = next.players[next.currentPlayerIndex];
  if (moves.length === 0) {
    next.log = [`${player.name} rolled ${value}. No legal moves.`, ...next.log].slice(0, 8);
  } else {
    next.log = [`${player.name} rolled ${value}. Select a token to move.`, ...next.log].slice(0, 8);
  }
  return next;
}
