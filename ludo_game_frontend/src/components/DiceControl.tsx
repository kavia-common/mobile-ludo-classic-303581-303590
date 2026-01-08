import React, { useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { OceanTheme } from "../theme";

type Props = {
  value: number | null;
  canRoll: boolean;
  isRolling: boolean;
  onRoll: () => void;
};

export function DiceControl({ value, canRoll, isRolling, onRoll }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const rotation = useMemo(
    () =>
      spin.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "720deg"],
      }),
    [spin]
  );

  const scale = useMemo(
    () =>
      pop.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06],
      }),
    [pop]
  );

  React.useEffect(() => {
    if (!isRolling) return;

    spin.setValue(0);
    pop.setValue(0);

    // Spin + subtle "pop" for a more lively roll.
    Animated.parallel([
      Animated.timing(spin, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pop, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(pop, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  }, [isRolling, pop, spin]);

  const disabled = !canRoll || isRolling;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roll dice"
        onPress={onRoll}
        disabled={disabled}
        style={({ pressed }) => [styles.btn, disabled && styles.btnDisabled, pressed && !disabled && styles.btnPressed]}
      >
        <Animated.View style={[styles.diceOuter, { transform: [{ rotate: rotation }, { scale }] }]}>
          <LinearGradient
            colors={["rgba(37, 99, 235, 0.18)", "rgba(245, 158, 11, 0.08)", "rgba(255,255,255, 0.7)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dice}
          >
            <Text style={styles.diceText}>{value ?? "?"}</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.meta}>
          <Text style={styles.title}>Dice</Text>
          <Text style={styles.subtitle}>{disabled ? (isRolling ? "Rolling…" : "Await move") : "Tap to roll"}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: OceanTheme.radii.lg,
    backgroundColor: OceanTheme.colors.surface,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.10)",
    shadowColor: "rgba(2, 6, 23, 0.18)",
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  btnPressed: { transform: [{ scale: 0.992 }] },
  btnDisabled: { opacity: 0.78 },

  diceOuter: {
    width: 56,
    height: 56,
    borderRadius: 16,
    shadowColor: "rgba(37, 99, 235, 0.28)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dice: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.20)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  diceText: { fontSize: 22, fontWeight: "900", color: OceanTheme.colors.text },

  meta: { flex: 1 },
  title: { fontSize: 14, fontWeight: "800", color: OceanTheme.colors.text },
  subtitle: { fontSize: 12, marginTop: 2, color: OceanTheme.colors.mutedText, fontWeight: "600" },
});
