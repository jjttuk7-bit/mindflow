"use client"

import { useEffect, useState } from "react"

export function useTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored === "dark") {
      setDark(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  function toggle() {
    setDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("theme", "light")
      }
      return next
    })
  }

  return { dark, toggle }
}
