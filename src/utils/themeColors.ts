const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim())
}

export function sanitizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return isValidHexColor(trimmed) ? trimmed : fallback
}

export function sanitizeOptionalHexColor(value: unknown, fallback: string | null): string | null {
  if (value === null) return null
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return isValidHexColor(trimmed) ? trimmed : fallback
}

export function parseHexColor(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace('#', '')
  if (raw.length === 3) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16),
    ]
  }
  if (raw.length === 6) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ]
  }
  return null
}

export function relativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex)
  if (!rgb) return 0.5
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function isDarkBackground(hex: string): boolean {
  return relativeLuminance(hex) < 0.4
}

/** Red-dominant accent (e.g. KMB red) — 末班車 uses inverted colors. */
export function isRedAccent(hex: string): boolean {
  const rgb = parseHexColor(hex)
  if (!rgb) return false
  const [r, g, b] = rgb
  return r >= 140 && r > g * 1.4 && r > b * 1.4
}

export function mixHex(bg: string, fg: string, ratio: number): string {
  const a = parseHexColor(bg)
  const b = parseHexColor(fg)
  if (!a || !b) return bg
  const mix = a.map((c, i) => Math.round(c * (1 - ratio) + b[i] * ratio))
  return `#${mix.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export interface ThemeCssVars {
  textPrimary: string
  textSecondary: string
  bgSecondary: string
  borderColor: string
  isDark: boolean
  isRedAccent: boolean
}

export function resolveThemeVars(
  bgColor: string,
  accentColor: string,
  textColor: string | null,
  highContrast: boolean,
): ThemeCssVars {
  const isDark = isDarkBackground(bgColor)
  const redAccent = isRedAccent(accentColor)

  if (textColor) {
    return {
      textPrimary: textColor,
      textSecondary: isDark ? mixHex(textColor, '#888888', 0.35) : mixHex(textColor, '#555555', 0.5),
      bgSecondary: isDark ? mixHex(bgColor, '#ffffff', 0.08) : mixHex(bgColor, '#000000', 0.04),
      borderColor: isDark ? mixHex(bgColor, '#ffffff', 0.18) : mixHex(bgColor, '#000000', 0.12),
      isDark,
      isRedAccent: redAccent,
    }
  }

  if (isDark) {
    return {
      textPrimary: highContrast ? '#ffffff' : '#f0f0f0',
      textSecondary: highContrast ? '#dddddd' : '#aaaaaa',
      bgSecondary: mixHex(bgColor, '#ffffff', 0.1),
      borderColor: mixHex(bgColor, '#ffffff', 0.2),
      isDark,
      isRedAccent: redAccent,
    }
  }

  return {
    textPrimary: highContrast ? '#000000' : '#1a1a1a',
    textSecondary: highContrast ? '#222222' : '#555555',
    bgSecondary: mixHex(bgColor, '#000000', 0.04),
    borderColor: mixHex(bgColor, '#000000', 0.12),
    isDark,
    isRedAccent: redAccent,
  }
}
