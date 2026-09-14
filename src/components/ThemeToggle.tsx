import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ThemeToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function ThemeToggle({
  className = "",
  variant = "ghost",
  size = "icon",
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`h-9 w-9 rounded-full border border-border/40 bg-background/50 ${className}`}
        disabled
      >
        <span className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const buttonContent = (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`relative h-9 rounded-full border border-border/60 bg-background/60 hover:bg-muted/80 backdrop-blur-md transition-all duration-300 group ${
        showLabel ? "px-3 gap-2 w-auto" : "w-9"
      } ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative h-4 w-4 flex items-center justify-center">
        <Sun
          className={`h-4 w-4 text-amber-500 transition-all duration-300 absolute ${
            isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          className={`h-4 w-4 text-indigo-400 transition-all duration-300 absolute ${
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-foreground/80">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      )}
    </Button>
  );

  if (showLabel) {
    return buttonContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {buttonContent}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs font-medium">
        Switch to {isDark ? "Light" : "Dark"} Mode
      </TooltipContent>
    </Tooltip>
  );
}
