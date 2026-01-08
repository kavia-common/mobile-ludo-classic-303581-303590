import React, { useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { OceanTheme } from "../theme";

type Props = {
  value: number | null;
  canRoll: boolean;
  isRolling: boolean;
  onRoll: () => void;
};

export function DiceControl({ value, canRoll, isRolling, onRoll }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  const rotation = useMemo(
    () =>
      spin.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [spin]
  );

  React.useEffect(() => {
    if (!isRolling) return;
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, [isRolling, spin]);

  const disabled = !canRoll || isRolling;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roll dice"
        onPress={onRoll}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          disabled && styles.btnDisabled,
          pressed && !disabled && styles.btnPressed,
        ]}
      >
        <Animated.View style={[styles.dice, { transform: [{ rotate: rotation }] }]}>
          <Text style={styles.diceText}>{value ?? "?"}</Text>
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
    borderColor: OceanTheme.colors.border,
    shadowColor: OceanTheme.colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  btnPressed: { transform: [{ scale: 0.99 }] },
  btnDisabled: { opacity: 0.75 },
  dice: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(37, 99, 235, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  diceText: { fontSize: 22, fontWeight: "800", color: OceanTheme.colors.text },
  meta: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: OceanTheme.colors.text },
  subtitle: { fontSize: 12, marginTop: 2, color: OceanTheme.colors.mutedText },
});
