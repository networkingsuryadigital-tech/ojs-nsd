"use client";

import { Moon, Sun } from "lucide-react";

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
      size="icon"
      className="h-8 w-8 text-foreground/70"
      onClick={toggleTheme}
      aria-label={theme === "light" ? labels.light : labels.dark}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
