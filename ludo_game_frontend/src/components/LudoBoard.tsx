import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

export function LudoBoard({ state, selectedMoves, onSelectMove }: Props) {
  const size = getGridSize();

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

  return (
    <View style={styles.boardCard}>
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
            if (inRedHome) bg = "rgba(239, 68, 68, 0.10)";
            if (inGreenHome) bg = "rgba(16, 185, 129, 0.10)";
            if (inYellowHome) bg = "rgba(245, 158, 11, 0.12)";
            if (inBlueHome) bg = "rgba(37, 99, 235, 0.10)";
            if (isSafe) bg = OceanTheme.colors.safeBg;
            if (isCenter) bg = "rgba(17, 24, 39, 0.04)";

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
                  isEntry && { borderColor: OceanTheme.colors.secondary, borderWidth: 2 },
                ]}
              />
            );
          })}

          {/* Tokens overlay */}
          {tokenRenders.map((t) => {
            const left = `${(t.c / size) * 100}%`;
            const top = `${(t.r / size) * 100}%`;
            const tokenMoves = legalMoveByTokenKey.get(`${t.playerId}:${t.tokenId}`) ?? [];
            const isSelectable = t.isSelectable;

            return (
              <View
                key={t.key}
                pointerEvents="box-none"
                style={[styles.tokenAnchor, { left, top, width: `${100 / size}%`, height: `${100 / size}%` }]}
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
                    { backgroundColor: t.color },
                    isSelectable && styles.tokenSelectable,
                    pressed && isSelectable && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Text style={styles.tokenText}>{t.tokenId + 1}</Text>
                </Pressable>
              </View>
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
    borderColor: OceanTheme.colors.border,
    padding: OceanTheme.spacing.md,
    shadowColor: OceanTheme.colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  boardTitle: { fontSize: 16, fontWeight: "800", color: OceanTheme.colors.text },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: OceanTheme.radii.pill,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.15)",
  },
  pillText: { fontSize: 12, fontWeight: "700", color: OceanTheme.colors.text },
  dot: { width: 10, height: 10, borderRadius: 999 },
  gridWrap: { width: "100%", aspectRatio: 1 },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: OceanTheme.radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: OceanTheme.colors.boardLine,
  },
  cell: {
    width: `${100 / 15}%`,
    height: `${100 / 15}%`,
    borderWidth: 0.5,
    borderColor: "rgba(203, 213, 225, 0.70)",
  },
  tokenAnchor: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  token: {
    width: "72%",
    height: "72%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    opacity: 0.9,
  },
  tokenSelectable: {
    opacity: 1,
    borderWidth: 2,
    borderColor: OceanTheme.colors.secondary,
  },
  tokenText: { fontSize: 11, fontWeight: "900", color: "#0B1220" },
  hint: { marginTop: 10, fontSize: 12, lineHeight: 16, color: OceanTheme.colors.mutedText },
});
