import React from "react";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DiceControl } from "./src/components/DiceControl";
import { LudoBoard } from "./src/components/LudoBoard";
import { advanceTurn, canRollDice, createInitialGameState, withDiceValue, applyMove } from "./src/game/engine";
import { OceanTheme } from "./src/theme";
import type { GameState, PlayerConfig, PlayerId, MoveOption } from "./src/game/types";
import { clearSavedGame, loadGame, saveGame } from "./src/storage/gameStorage";
import { hapticTap, initFeedback, playSound, unloadFeedback } from "./src/utils/feedback";

const DEFAULT_PLAYERS: PlayerConfig[] = [
  { id: "red", name: "Red", color: OceanTheme.colors.playerRed, isActive: true },
  { id: "green", name: "Green", color: OceanTheme.colors.playerGreen, isActive: true },
  { id: "yellow", name: "Yellow", color: OceanTheme.colors.playerYellow, isActive: false },
  { id: "blue", name: "Blue", color: OceanTheme.colors.playerBlue, isActive: false },
];

type SetupState = {
  players: PlayerConfig[];
};

function randomDice(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export default function App() {
  const [setup, setSetup] = React.useState<SetupState>({ players: DEFAULT_PLAYERS });
  const [game, setGame] = React.useState<GameState | null>(null);
  const [loadingRestore, setLoadingRestore] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    // Best-effort: preload sound effects + prep haptics. No-op on unsupported platforms.
    initFeedback().catch(() => {
      // ignore init errors
    });

    (async () => {
      try {
        const saved = await loadGame();
        if (mounted && saved) {
          setGame(saved);
        }
      } finally {
        if (mounted) setLoadingRestore(false);
      }
    })();

    return () => {
      mounted = false;
      unloadFeedback().catch(() => {
        // ignore cleanup errors
      });
    };
  }, []);

  // Persist ongoing game state (throttled by React render; good enough for this app).
  React.useEffect(() => {
    if (!game) return;
    (async () => {
      try {
        await saveGame(game);
      } catch {
        // ignore persistence issues
      }
    })();
  }, [game]);

  const activeCount = setup.players.filter((p) => p.isActive).length;

  const startNewGame = React.useCallback(async () => {
    if (activeCount < 2 || activeCount > 4) {
      Alert.alert("Players", "Please select 2 to 4 players.");
      return;
    }
    const newState = createInitialGameState(setup.players);
    setGame(newState);
    try {
      await saveGame(newState);
    } catch {
      // ignore
    }
  }, [activeCount, setup.players]);

  const resetToSetup = React.useCallback(async () => {
    Alert.alert("Reset", "Start a new game?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New Game",
        style: "destructive",
        onPress: async () => {
          setGame(null);
          await clearSavedGame();
        },
      },
    ]);
  }, []);

  const onRollDice = React.useCallback(() => {
    if (!game) return;
    if (!canRollDice(game)) return;

    // Immediate tactile + sound feedback.
    hapticTap("light").catch(() => {
      // ignore
    });
    playSound("dice").catch(() => {
      // ignore
    });

    // Mark rolling for UX; then set value after short delay.
    setGame((g) => (g ? { ...g, dice: { ...g.dice, isRolling: true } } : g));
    const val = randomDice();

    setTimeout(() => {
      setGame((g) => {
        if (!g) return g;
        const withVal = { ...g, dice: { value: g.dice.value, isRolling: false } };
        // use engine setter so legalMoves/log update
        return withDiceValue(withVal, val);
      });
    }, 650);
  }, [game]);

  const onSelectMove = React.useCallback(
    (move: MoveOption) => {
      if (!game) return;

      // Feedback based on move type.
      const isCapture = move.captures.length > 0;
      if (isCapture) {
        hapticTap("warning").catch(() => {
          // ignore
        });
        playSound("capture").catch(() => {
          // ignore
        });
      } else {
        hapticTap("medium").catch(() => {
          // ignore
        });
        playSound("move").catch(() => {
          // ignore
        });
      }

      const prevDice = game.dice.value;

      const nextAfterMove = applyMove(game, move);
      const hadAnyMove = game.legalMoves.length > 0;
      const advanced = advanceTurn(nextAfterMove, prevDice, hadAnyMove);

      setGame(advanced);
    },
    [game]
  );

  const updatePlayer = React.useCallback(
    (playerId: PlayerId, patch: Partial<PlayerConfig>) => {
      setSetup((s) => ({
        players: s.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
      }));
    },
    []
  );

  const togglePlayer = React.useCallback(
    (playerId: PlayerId) => {
      setSetup((s) => {
        const next = s.players.map((p) => (p.id === playerId ? { ...p, isActive: !p.isActive } : p));
        // Ensure at least 2 active (soft guard; UI will prompt on start).
        return { players: next };
      });
    },
    []
  );

  const restoreSaved = React.useCallback(async () => {
    setLoadingRestore(true);
    try {
      const saved = await loadGame();
      if (!saved) {
        Alert.alert("Restore", "No saved game found.");
        return;
      }
      setGame(saved);
    } finally {
      setLoadingRestore(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={Platform.OS === "web" ? "dark" : "dark"} />
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.appTitle}>Mobile Ludo</Text>
            <Text style={styles.appSubtitle}>Ocean Professional • Local Multiplayer</Text>
          </View>

          <View style={styles.headerActions}>
            <Text onPress={restoreSaved} style={styles.linkBtn} accessibilityRole="button">
              Restore
            </Text>
            <Text onPress={resetToSetup} style={[styles.linkBtn, { color: OceanTheme.colors.error }]} accessibilityRole="button">
              New Game
            </Text>
          </View>
        </View>

        {!game ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Player Setup</Text>
            <Text style={styles.cardSubtitle}>Choose 2–4 players and rename them.</Text>

            <View style={styles.setupList}>
              {setup.players.map((p) => (
                <View key={p.id} style={styles.playerRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: p.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerLabel}>
                      {p.id.toUpperCase()} {p.isActive ? "• Active" : "• Inactive"}
                    </Text>
                    <TextInput
                      value={p.name}
                      onChangeText={(t) => updatePlayer(p.id, { name: t })}
                      placeholder={`${p.id} player name`}
                      placeholderTextColor={OceanTheme.colors.mutedText}
                      style={styles.input}
                    />
                  </View>
                  <Text
                    accessibilityRole="button"
                    onPress={() => togglePlayer(p.id)}
                    style={[
                      styles.toggle,
                      { backgroundColor: p.isActive ? "rgba(37, 99, 235, 0.10)" : "rgba(17, 24, 39, 0.06)" },
                      { borderColor: p.isActive ? "rgba(37, 99, 235, 0.25)" : "rgba(17, 24, 39, 0.08)" },
                    ]}
                  >
                    {p.isActive ? "On" : "Off"}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.note}>Active players: {activeCount}. Start when ready.</Text>

            <Text accessibilityRole="button" onPress={startNewGame} style={styles.primaryBtn}>
              Start Game
            </Text>

            {loadingRestore ? <Text style={styles.smallMuted}>Checking saved game…</Text> : null}
          </View>
        ) : (
          <View style={styles.gameWrap}>
            <LudoBoard state={game} selectedMoves={game.legalMoves} onSelectMove={onSelectMove} />

            <View style={{ height: OceanTheme.spacing.md }} />

            <DiceControl value={game.dice.value} canRoll={canRollDice(game)} isRolling={game.dice.isRolling} onRoll={onRollDice} />

            <View style={styles.logCard}>
              <Text style={styles.logTitle}>Move Log</Text>
              {game.status === "finished" ? (
                <Text style={styles.winText}>
                  Winner:{" "}
                  <Text style={{ fontWeight: "900", color: OceanTheme.colors.primary }}>
                    {game.players.find((p) => p.id === game.winner)?.name ?? "—"}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.smallMuted}>
                  {canRollDice(game) ? "Roll the dice to continue." : "Make a move (tap a highlighted token)."}
                </Text>
              )}

              <View style={{ marginTop: 10, gap: 6 }}>
                {game.log.map((line, idx) => (
                  <Text key={`${idx}:${line}`} style={styles.logLine}>
                    • {line}
                  </Text>
                ))}
              </View>

              <Text
                accessibilityRole="button"
                onPress={async () => {
                  if (!game) return;
                  await saveGame(game);
                  Alert.alert("Saved", "Game saved locally.");
                }}
                style={styles.secondaryBtn}
              >
                Save Now
              </Text>
            </View>

            <Text style={styles.footer}>
              Rules: roll 6 to enter from yard • captures happen on non-safe cells • first player to finish all 4 tokens wins
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: OceanTheme.colors.background },
  container: {
    padding: OceanTheme.spacing.lg,
    paddingBottom: OceanTheme.spacing.xl,
    gap: OceanTheme.spacing.lg,
    backgroundColor: OceanTheme.colors.background,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  appTitle: { fontSize: 24, fontWeight: "900", color: OceanTheme.colors.text, letterSpacing: 0.2 },
  appSubtitle: { marginTop: 4, fontSize: 12, color: OceanTheme.colors.mutedText, fontWeight: "600" },
  headerActions: { flexDirection: "row", gap: 14, marginTop: 6 },
  linkBtn: { fontSize: 13, fontWeight: "800", color: OceanTheme.colors.primary },

  card: {
    borderRadius: OceanTheme.radii.xl,
    backgroundColor: OceanTheme.colors.surface,
    borderWidth: 1,
    borderColor: OceanTheme.colors.border,
    padding: OceanTheme.spacing.lg,
    shadowColor: OceanTheme.colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: "900", color: OceanTheme.colors.text },
  cardSubtitle: { marginTop: 6, fontSize: 12, lineHeight: 16, color: OceanTheme.colors.mutedText },
  setupList: { marginTop: 14, gap: 12 },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: OceanTheme.radii.lg,
    backgroundColor: "rgba(17, 24, 39, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(17, 24, 39, 0.06)",
  },
  colorSwatch: { width: 14, height: 14, borderRadius: 999 },
  playerLabel: { fontSize: 11, color: OceanTheme.colors.mutedText, fontWeight: "800" },
  input: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: OceanTheme.radii.md,
    borderWidth: 1,
    borderColor: "rgba(17, 24, 39, 0.10)",
    backgroundColor: OceanTheme.colors.surface,
    color: OceanTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: OceanTheme.radii.md,
    borderWidth: 1,
    fontWeight: "900",
    color: OceanTheme.colors.text,
    overflow: "hidden",
  },
  note: { marginTop: 14, fontSize: 12, color: OceanTheme.colors.mutedText, fontWeight: "700" },
  primaryBtn: {
    marginTop: 14,
    textAlign: "center",
    paddingVertical: 12,
    borderRadius: OceanTheme.radii.lg,
    backgroundColor: OceanTheme.colors.primary,
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    overflow: "hidden",
  },
  secondaryBtn: {
    marginTop: 14,
    textAlign: "center",
    paddingVertical: 12,
    borderRadius: OceanTheme.radii.lg,
    backgroundColor: "rgba(37, 99, 235, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.18)",
    color: OceanTheme.colors.text,
    fontSize: 14,
    fontWeight: "900",
    overflow: "hidden",
  },
  smallMuted: { marginTop: 10, fontSize: 12, color: OceanTheme.colors.mutedText, fontWeight: "600" },

  gameWrap: { width: "100%" },

  logCard: {
    marginTop: OceanTheme.spacing.md,
    borderRadius: OceanTheme.radii.xl,
    backgroundColor: OceanTheme.colors.surface,
    borderWidth: 1,
    borderColor: OceanTheme.colors.border,
    padding: OceanTheme.spacing.lg,
  },
  logTitle: { fontSize: 14, fontWeight: "900", color: OceanTheme.colors.text },
  logLine: { fontSize: 12, color: OceanTheme.colors.text, fontWeight: "600", lineHeight: 16 },
  winText: { marginTop: 8, fontSize: 12, color: OceanTheme.colors.text, fontWeight: "700" },

  footer: { marginTop: 12, fontSize: 11, lineHeight: 15, color: OceanTheme.colors.mutedText, fontWeight: "600" },
});
