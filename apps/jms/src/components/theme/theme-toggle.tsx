"use client";

import { Button } from "@nsd/ui/button";

import { useTheme } from "./theme-provider";

type ThemeToggleProps = {
  labels?: { light: string; dark: string };
};

export function ThemeToggle({
  labels = { light: "Mode gelap", dark: "Mode terang" },
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={theme === "light" ? labels.light : labels.dark}
    >
      {theme === "light" ? "☀" : "☾"}
    </Button>
  );
}
