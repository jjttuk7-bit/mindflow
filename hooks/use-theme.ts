"use client"

import { useTheme as useNextTheme } from "next-themes"

export function useTheme() {
  const { resolvedTheme, setTheme } = useNextTheme()
  const dark = resolvedTheme === "dark"

  function toggle() {
    setTheme(dark ? "light" : "dark")
  }

  return { dark, toggle }
}
