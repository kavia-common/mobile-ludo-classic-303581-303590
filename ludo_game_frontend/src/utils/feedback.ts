import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

type FeedbackSoundKey = "dice" | "move" | "capture";

type LoadedSound = {
  sound: Audio.Sound;
  /** Ensures we don't double-unload. */
  unloaded: boolean;
};

let isInitialized = false;
let isAudioEnabled = true;
let isHapticsEnabled = true;

const loaded: Partial<Record<FeedbackSoundKey, LoadedSound>> = {};

/**
 * Uses short, generated beeps so we don't need bundled asset files.
 * These are tiny data URIs; good enough for "basic sound effects".
 */
const SOUND_URIS: Record<FeedbackSoundKey, string> = {
  // Higher pitched "tick" (dice)
  dice:
    "data:audio/wav;base64,UklGRj4AAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YRoAAAAA//8AAP//AAD//wAA//8AAP//AAD//wAA",
  // Mid pitch "blip" (move)
  move:
    "data:audio/wav;base64,UklGRj4AAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YRoAAAAA//8AAN/f3wAA39/fAADf398AAN/f3wAA39/fAADf398A",
  // Lower "thud" style (capture)
  capture:
    "data:audio/wav;base64,UklGRj4AAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YRoAAAAAAP//AAB/f38AAH9/fwAAf39/AAB/f38AAH9/fwAAf39/",
};

/** Best-effort initialization; safe to call multiple times. */
async function ensureInit(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  // Audio is not supported in some web contexts; allow silent fallback.
  if (Platform.OS === "web") {
    isHapticsEnabled = false; // web haptics not available via expo-haptics
  }

  try {
    // Make audio play even in iOS silent mode.
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
    });
  } catch {
    // If this fails, we keep going but disable audio.
    isAudioEnabled = false;
  }
}

async function loadSound(key: FeedbackSoundKey): Promise<LoadedSound | null> {
  if (!isAudioEnabled) return null;
  const existing = loaded[key];
  if (existing && !existing.unloaded) return existing;

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUND_URIS[key] },
      { shouldPlay: false, volume: 0.7 },
      undefined
    );
    const entry: LoadedSound = { sound, unloaded: false };
    loaded[key] = entry;
    return entry;
  } catch {
    isAudioEnabled = false;
    return null;
  }
}

// PUBLIC_INTERFACE
export async function initFeedback(): Promise<void> {
  /** This is a public function. Preloads feedback systems (audio/haptics) best-effort. */
  await ensureInit();
  // Preload sounds so first interaction is snappy.
  await Promise.all([loadSound("dice"), loadSound("move"), loadSound("capture")]);
}

// PUBLIC_INTERFACE
export async function playSound(key: FeedbackSoundKey): Promise<void> {
  /** This is a public function. Plays a short UI sound effect, best-effort. */
  await ensureInit();
  const entry = await loadSound(key);
  if (!entry) return;
  try {
    // Restart from beginning for repeatable clicks.
    await entry.sound.setPositionAsync(0);
    await entry.sound.playAsync();
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export async function hapticTap(kind: "light" | "medium" | "success" | "warning" = "light"): Promise<void> {
  /** This is a public function. Triggers haptic feedback (native only), best-effort. */
  await ensureInit();
  if (!isHapticsEnabled) return;

  try {
    if (kind === "success") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (kind === "warning") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    await Haptics.impactAsync(kind === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export async function unloadFeedback(): Promise<void> {
  /** This is a public function. Unloads sounds to free resources (best-effort). */
  const keys: FeedbackSoundKey[] = ["dice", "move", "capture"];
  await Promise.all(
    keys.map(async (k) => {
      const entry = loaded[k];
      if (!entry || entry.unloaded) return;
      try {
        entry.unloaded = true;
        await entry.sound.unloadAsync();
      } catch {
        // ignore
      }
    })
  );
}
