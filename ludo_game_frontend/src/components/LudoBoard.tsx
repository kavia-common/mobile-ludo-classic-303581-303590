import React, { useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getCellRCForStep, getEntryRC, getGridSize } from "../game/boardGeometry";
import { SAFE_TRACK_STEPS, TRACK_LEN, type GameState, type MoveOption, type PlayerId } from "../game/types";
import { OceanTheme } from "../theme";

type Props = {
  state: GameState;
  selectedMoves: MoveOption[];
  onSelectMove: (move: MoveOption) => void;
};

type TokenRender = {
  key: string;
  playerId: PlayerId;
  tokenId: number;
  r: number;
  c: number;
  color: string;
  isSelectable: boolean;
};

const PLAYER_COLORS: Record<PlayerId, string> = {
  red: OceanTheme.colors.playerRed,
  green: OceanTheme.colors.playerGreen,
  yellow: OceanTheme.colors.playerYellow,
  blue: OceanTheme.colors.playerBlue,
};

function cellKey(r: number, c: number) {
  return `${r}:${c}`;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function mixAlpha(hexOrRgb: string, alpha: number): string {
  // We keep this simple and just return a rgba approximation for shadows/highlights.
  // If the color isn't a hex string, fall back to a safe ocean-blue tint.
  if (!hexOrRgb.startsWith("#")) return `rgba(37, 99, 235, ${clamp01(alpha)})`;
  const hex = hexOrRgb.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}

/**
 * Hook: keeps Animated.Value instances stable per token key.
 * We animate tokenAnchor's left/top to smoothly transition between cells.
 */
function useTokenAnimMap() {
  const mapRef = useRef(
    new Map<
      string,
      {
        x: Animated.Value;
        y: Animated.Value;
        pulse: Animated.Value;
      }
    >()
  );

  return mapRef.current;
}

export function LudoBoard({ state, selectedMoves, onSelectMove }: Props) {
  const size = getGridSize();
  const cellSizePct = 100 / size;

  const currentPlayerId = state.players[state.currentPlayerIndex]?.id;

  const legalMoveByTokenKey = useMemo(() => {
    const map = new Map<string, MoveOption[]>();
    for (const m of selectedMoves) {
      const k = `${m.playerId}:${m.tokenId}`;
      const arr = map.get(k) ?? [];
      arr.push(m);
      map.set(k, arr);
    }
    return map;
  }, [selectedMoves]);

  const tokenRenders: TokenRender[] = useMemo(() => {
    const tokens: TokenRender[] = [];
    for (const p of state.players) {
      for (const t of state.tokens[p.id]) {
        if (t.step === null || t.isFinished) continue;
        const rc = getCellRCForStep(p.id, t.step);
        tokens.push({
          key: `${p.id}:${t.id}`,
          playerId: p.id,
          tokenId: t.id,
          r: rc.r,
          c: rc.c,
          color: PLAYER_COLORS[p.id],
          isSelectable: legalMoveByTokenKey.has(`${p.id}:${t.id}`),
        });
      }
    }
    return tokens;
  }, [state.players, state.tokens, legalMoveByTokenKey]);

  const entryByPlayer = useMemo(() => {
    return {
      red: getEntryRC("red"),
      green: getEntryRC("green"),
      yellow: getEntryRC("yellow"),
      blue: getEntryRC("blue"),
    } as const;
  }, []);

  const safeCells = useMemo(() => {
    const set = new Set<string>();
    for (const step of SAFE_TRACK_STEPS) {
      if (step >= 0 && step < TRACK_LEN) {
        const rc = getCellRCForStep("red", step); // shared mapping, player doesn't matter
        set.add(cellKey(rc.r, rc.c));
      }
    }
    return set;
  }, []);

  const tokenAnimMap = useTokenAnimMap();

  // Animate token positions whenever their computed cell changes.
  React.useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    for (const t of tokenRenders) {
      const key = t.key;
      const leftPct = t.c * cellSizePct;
      const topPct = t.r * cellSizePct;

      let entry = tokenAnimMap.get(key);
      if (!entry) {
        entry = {
          x: new Animated.Value(leftPct),
          y: new Animated.Value(topPct),
          pulse: new Animated.Value(0),
        };
        tokenAnimMap.set(key, entry);
      }

      // Smooth movement.
      animations.push(
        Animated.timing(entry.x, {
          toValue: leftPct,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false, // left/top cannot use native driver
        })
      );
      animations.push(
        Animated.timing(entry.y, {
          toValue: topPct,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        })
      );

      // Subtle pulse if token is selectable.
      if (t.isSelectable) {
        // Restart a short pulse on re-render if it isn't already moving.
        entry.pulse.setValue(0);
        animations.push(
          Animated.sequence([
            Animated.timing(entry.pulse, { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.timing(entry.pulse, { toValue: 0, duration: 260, useNativeDriver: true }),
          ])
        );
      }
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [cellSizePct, tokenAnimMap, tokenRenders]);

  return (
    <View style={styles.boardCard}>
      <LinearGradient
        colors={["rgba(37, 99, 235, 0.08)", "rgba(249, 250, 251, 0.7)", "rgba(255,255,255,1)"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.headerRow}>
        <Text style={styles.boardTitle}>Ludo Board</Text>
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: PLAYER_COLORS[currentPlayerId] ?? OceanTheme.colors.primary }]} />
          <Text style={styles.pillText}>{state.players[state.currentPlayerIndex]?.name ?? "—"}’s turn</Text>
        </View>
      </View>

      <View style={styles.gridWrap}>
        <View style={styles.grid}>
          {Array.from({ length: size * size }).map((_, idx) => {
            const r = Math.floor(idx / size);
            const c = idx % size;
            const k = cellKey(r, c);

            const isCenter = r === 7 && c === 7;
            const isSafe = safeCells.has(k);

            // Corner homes approximations
            const inRedHome = r <= 5 && c <= 5;
            const inGreenHome = r <= 5 && c >= 9;
            const inYellowHome = r >= 9 && c >= 9;
            const inBlueHome = r >= 9 && c <= 5;

            let bg = OceanTheme.colors.boardBg;
            if (inRedHome) bg = "rgba(239, 68, 68, 0.08)";
            if (inGreenHome) bg = "rgba(16, 185, 129, 0.08)";
            if (inYellowHome) bg = "rgba(245, 158, 11, 0.10)";
            if (inBlueHome) bg = "rgba(37, 99, 235, 0.08)";
            if (isSafe) bg = OceanTheme.colors.safeBg;
            if (isCenter) bg = "rgba(17, 24, 39, 0.035)";

            // Entry markers
            const isEntry =
              (r === entryByPlayer.red.r && c === entryByPlayer.red.c) ||
              (r === entryByPlayer.green.r && c === entryByPlayer.green.c) ||
              (r === entryByPlayer.yellow.r && c === entryByPlayer.yellow.c) ||
              (r === entryByPlayer.blue.r && c === entryByPlayer.blue.c);

            return (
              <View
                key={k}
                style={[
                  styles.cell,
                  { backgroundColor: bg },
                  isEntry && { borderColor: "rgba(245, 158, 11, 0.85)", borderWidth: 1.5 },
                ]}
              />
            );
          })}

          {/* Tokens overlay */}
          {tokenRenders.map((t) => {
            const tokenMoves = legalMoveByTokenKey.get(`${t.playerId}:${t.tokenId}`) ?? [];
            const isSelectable = t.isSelectable;

            const anim = tokenAnimMap.get(t.key);
            if (!anim) return null;

            const pulseScale = anim.pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.04],
            });

            return (
              <Animated.View
                key={t.key}
                pointerEvents="box-none"
                style={[
                  styles.tokenAnchor,
                  {
                    left: anim.x.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                    top: anim.y.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                    width: `${cellSizePct}%`,
                    height: `${cellSizePct}%`,
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Token ${t.tokenId + 1} (${t.playerId})`}
                  onPress={() => {
                    // If multiple moves (rare in this simplified engine), pick the first.
                    if (tokenMoves[0]) onSelectMove(tokenMoves[0]);
                  }}
                  disabled={!isSelectable}
                  style={({ pressed }) => [
                    styles.token,
                    {
                      borderColor: isSelectable ? "rgba(245, 158, 11, 0.95)" : "rgba(255,255,255,0.85)",
                      shadowColor: mixAlpha(t.color, isSelectable ? 0.28 : 0.18),
                      opacity: isSelectable ? 1 : 0.92,
                      transform: [{ scale: pressed && isSelectable ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.tokenInner,
                      {
                        transform: [{ scale: isSelectable ? pulseScale : 1 }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[mixAlpha(t.color, 0.22), mixAlpha("#ffffff", 0.65)]}
                      start={{ x: 0.2, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.tokenGradient, { backgroundColor: t.color }]}
                    >
                      <Text style={styles.tokenText}>{t.tokenId + 1}</Text>
                    </LinearGradient>
                  </Animated.View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <Text style={styles.hint}>
        Tap a highlighted token to move. Safe cells prevent captures; rolling a 6 grants entry from yard and an extra turn.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  boardCard: {
    width: "100%",
    borderRadius: OceanTheme.radii.xl,
    backgroundColor: OceanTheme.colors.surface,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.10)",
    padding: OceanTheme.spacing.md,
    shadowColor: "rgba(2, 6, 23, 0.20)",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
    overflow: "hidden",
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  boardTitle: { fontSize: 16, fontWeight: "900", color: OceanTheme.colors.text },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: OceanTheme.radii.pill,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.16)",
  },
  pillText: { fontSize: 12, fontWeight: "800", color: OceanTheme.colors.text },
  dot: { width: 10, height: 10, borderRadius: 999 },

  gridWrap: { width: "100%", aspectRatio: 1 },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: OceanTheme.radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.85)",
    backgroundColor: "#fff",
  },
  cell: {
    width: `${100 / 15}%`,
    height: `${100 / 15}%`,
    borderWidth: 0.5,
    borderColor: "rgba(203, 213, 225, 0.65)",
  },

  tokenAnchor: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  token: {
    width: "74%",
    height: "74%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    backgroundColor: "transparent",
  },
  tokenInner: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  tokenGradient: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenText: { fontSize: 11, fontWeight: "900", color: "#0B1220" },

  hint: { marginTop: 10, fontSize: 12, lineHeight: 16, color: OceanTheme.colors.mutedText, fontWeight: "600" },
});
