export const themes = {
  light: {
    background: "#ffffff",
    text: "#1f2328",
    border: "#d0d7de",
  },
  dark: {
    background: "#0d1117",
    text: "#f0f6fc",
    border: "#30363d",
  },
} as const;

export const pickTheme = (
  theme: "light" | "dark" | "auto",
  prefersDark: boolean,
): "light" | "dark" => {
  if (theme === "auto") return prefersDark ? "dark" : "light";
  return theme;
};
