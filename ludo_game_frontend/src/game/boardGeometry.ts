import { ENTRY_INDEX, PLAYER_ORDER, TRACK_LEN, type PlayerId } from "./types";

/**
 * 15x15 classic Ludo board approximation:
 * - Shared track cells placed around central cross.
 * - Home stretches are the 6 cells leading into the center for each color.
 *
 * We map:
 * - shared track steps 0..51 -> {r,c} positions (15x15 grid)
 * - home stretch steps 52..57 -> per-player {r,c} positions
 *
 * This is intentionally simplified but visually classic.
 */

export type RC = { r: number; c: number };

const GRID = 15;

/** Helper to build a loop path around the cross lanes. */
function buildSharedTrack(): RC[] {
  // Path handcrafted for 15x15 Ludo board.
  // This follows the outer ring around center cross (not the full border).
  const p: RC[] = [];

  // Starting at red entry (near top-left lane), moving clockwise.
  // Top-left vertical lane down
  p.push({ r: 6, c: 1 });
  p.push({ r: 6, c: 2 });
  p.push({ r: 6, c: 3 });
  p.push({ r: 6, c: 4 });
  p.push({ r: 6, c: 5 });

  // Up to top center
  p.push({ r: 5, c: 6 });
  p.push({ r: 4, c: 6 });
  p.push({ r: 3, c: 6 });
  p.push({ r: 2, c: 6 });
  p.push({ r: 1, c: 6 });

  // Across top to right
  p.push({ r: 1, c: 7 });
  p.push({ r: 1, c: 8 });

  // Down right top lane
  p.push({ r: 2, c: 8 });
  p.push({ r: 3, c: 8 });
  p.push({ r: 4, c: 8 });
  p.push({ r: 5, c: 8 });

  // To right mid
  p.push({ r: 6, c: 9 });
  p.push({ r: 6, c: 10 });
  p.push({ r: 6, c: 11 });
  p.push({ r: 6, c: 12 });
  p.push({ r: 6, c: 13 });

  // Down to bottom-right
  p.push({ r: 7, c: 13 });
  p.push({ r: 8, c: 13 });

  // Left along bottom lane
  p.push({ r: 8, c: 12 });
  p.push({ r: 8, c: 11 });
  p.push({ r: 8, c: 10 });
  p.push({ r: 8, c: 9 });

  // Down to bottom center
  p.push({ r: 9, c: 8 });
  p.push({ r: 10, c: 8 });
  p.push({ r: 11, c: 8 });
  p.push({ r: 12, c: 8 });
  p.push({ r: 13, c: 8 });

  // Across bottom to left
  p.push({ r: 13, c: 7 });
  p.push({ r: 13, c: 6 });

  // Up left bottom lane
  p.push({ r: 12, c: 6 });
  p.push({ r: 11, c: 6 });
  p.push({ r: 10, c: 6 });
  p.push({ r: 9, c: 6 });

  // Left to bottom-left
  p.push({ r: 8, c: 5 });
  p.push({ r: 8, c: 4 });
  p.push({ r: 8, c: 3 });
  p.push({ r: 8, c: 2 });
  p.push({ r: 8, c: 1 });

  // Back up to start
  p.push({ r: 7, c: 1 });

  // That's 1 less than 52, fill remaining with adjacent inner ring to get 52.
  // We extend around the mid cross turns to reach 52 positions.
  // Insert additional steps around the four corners of the cross:
  const extra: RC[] = [
    { r: 6, c: 6 },
    { r: 6, c: 7 },
    { r: 6, c: 8 },
    { r: 7, c: 8 },
    { r: 8, c: 8 },
    { r: 8, c: 7 },
    { r: 8, c: 6 },
    { r: 7, c: 6 },
    { r: 7, c: 5 },
    { r: 5, c: 7 },
    { r: 7, c: 9 },
  ];

  const combined = [...p, ...extra];

  // Normalize to exactly 52 unique-ish steps by trimming.
  return combined.slice(0, TRACK_LEN);
}

const SHARED_TRACK: RC[] = buildSharedTrack();

const HOME_STRETCH: Record<PlayerId, RC[]> = {
  red: [
    { r: 7, c: 2 },
    { r: 7, c: 3 },
    { r: 7, c: 4 },
    { r: 7, c: 5 },
    { r: 7, c: 6 },
    { r: 7, c: 7 },
  ],
  green: [
    { r: 2, c: 7 },
    { r: 3, c: 7 },
    { r: 4, c: 7 },
    { r: 5, c: 7 },
    { r: 6, c: 7 },
    { r: 7, c: 7 },
  ],
  yellow: [
    { r: 7, c: 12 },
    { r: 7, c: 11 },
    { r: 7, c: 10 },
    { r: 7, c: 9 },
    { r: 7, c: 8 },
    { r: 7, c: 7 },
  ],
  blue: [
    { r: 12, c: 7 },
    { r: 11, c: 7 },
    { r: 10, c: 7 },
    { r: 9, c: 7 },
    { r: 8, c: 7 },
    { r: 7, c: 7 },
  ],
};

export function getCellRCForStep(playerId: PlayerId, step: number): RC {
  if (step >= TRACK_LEN) {
    const idx = Math.max(0, Math.min(5, step - TRACK_LEN));
    return HOME_STRETCH[playerId][idx];
  }
  return SHARED_TRACK[step];
}

export function getEntryRC(playerId: PlayerId): RC {
  return SHARED_TRACK[ENTRY_INDEX[playerId]];
}

export function isWithinGrid(rc: RC): boolean {
  return rc.r >= 0 && rc.r < GRID && rc.c >= 0 && rc.c < GRID;
}

export function getGridSize(): number {
  return GRID;
}

export function getPlayersInClockwiseOrder(): PlayerId[] {
  return PLAYER_ORDER;
}
