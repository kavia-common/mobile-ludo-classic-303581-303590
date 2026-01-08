import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GameState } from "../game/types";

const KEY = "ludo_game_state_v1";

// PUBLIC_INTERFACE
export async function saveGame(state: GameState): Promise<void> {
  /** This is a public function. Persist current game state to device storage. */
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

// PUBLIC_INTERFACE
export async function loadGame(): Promise<GameState | null> {
  /** This is a public function. Load game state from device storage; returns null if none. */
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export async function clearSavedGame(): Promise<void> {
  /** This is a public function. Clears saved game state (used for reset/new game). */
  await AsyncStorage.removeItem(KEY);
}
