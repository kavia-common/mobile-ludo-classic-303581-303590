export const OceanTheme = {
  name: "Ocean Professional",
  colors: {
    primary: "#2563EB",
    secondary: "#F59E0B",
    success: "#F59E0B",
    error: "#EF4444",
    background: "#f9fafb",
    surface: "#ffffff",
    text: "#111827",
    mutedText: "#6B7280",
    border: "#E5E7EB",
    shadow: "rgba(17, 24, 39, 0.10)",
    overlay: "rgba(17, 24, 39, 0.35)",
    // player colors (harmonized with Ocean theme)
    playerRed: "#EF4444",
    playerGreen: "#10B981",
    playerYellow: "#F59E0B",
    playerBlue: "#2563EB",
    // board accents
    boardLine: "#CBD5E1",
    boardBg: "#FFFFFF",
    safeBg: "rgba(37, 99, 235, 0.10)",
  },
  radii: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
} as const;

export type Theme = typeof OceanTheme;
