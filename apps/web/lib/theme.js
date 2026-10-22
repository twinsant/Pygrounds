export const THEME_STORAGE_KEY = 'pygrounds-theme'
export const UI_FONT = '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'

export const palettes = {
  dark: {
    canvas: '#101622',
    surface: '#1e293b',
    surfaceRaised: '#253247',
    border: '#324467',
    text: '#f8fafc',
    muted: '#a3b4d2',
    primary: '#135bec',
    primaryHover: '#2563eb',
    onPrimary: '#ffffff',
    accent: '#8ab4ff',
    selection: '#203657',
    danger: '#fca5a5',
    success: '#6ee7b7',
    warning: '#fcd34d',
    magenta: '#d8b4fe',
    cyan: '#67e8f9',
    scrim: '#101622eb',
  },
  light: {
    canvas: '#f6f6f8',
    surface: '#ffffff',
    surfaceRaised: '#eef2f7',
    border: '#c8d2e1',
    text: '#152238',
    muted: '#52647f',
    primary: '#135bec',
    primaryHover: '#104fcf',
    onPrimary: '#ffffff',
    accent: '#135bec',
    selection: '#e1ebff',
    danger: '#b42318',
    success: '#047857',
    warning: '#854d0e',
    magenta: '#7e22ce',
    cyan: '#0e7490',
    scrim: '#f6f6f8eb',
  },
}

export function resolveTheme(preference, systemDark) {
  return preference === 'light' || preference === 'dark'
    ? preference
    : systemDark ? 'dark' : 'light'
}

export function getThemeVariables(mode) {
  return Object.fromEntries(Object.entries(palettes[mode]).map(([key, value]) => [
    `--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value,
  ]))
}

export const themeCss = Object.keys(palettes).map(mode => (
  `html[data-theme="${mode}"]{color-scheme:${mode};${Object.entries(getThemeVariables(mode)).map(([key, value]) => (
    `${key}:${value};`
  )).join('')}}`
)).join('')

// Run the same theme resolution before hydration to avoid a wrong-mode flash.
export const themeBootstrap = `(() => {
  let preference = null;
  try { preference = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); }
  catch (error) { console.warn('Theme preference could not be read.', error); }
  document.documentElement.dataset.theme = (${resolveTheme.toString()})(preference, matchMedia('(prefers-color-scheme: dark)').matches);
})();`

export function getMonacoTheme(mode) {
  const p = palettes[mode]
  return {
    base: mode === 'dark' ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [{ token: 'comment', foreground: p.muted.slice(1) }],
    colors: {
      'editor.background': p.canvas,
      'editor.foreground': p.text,
      'editorLineNumber.foreground': p.muted,
      'editorLineNumber.activeForeground': p.accent,
      'editorCursor.foreground': p.accent,
      'editor.selectionBackground': p.selection,
      'editor.inactiveSelectionBackground': p.selection,
      'editor.lineHighlightBackground': p.surfaceRaised,
      'editorWidget.background': p.surface,
      'editorWidget.border': p.border,
      'editorHoverWidget.background': p.surface,
      'editorHoverWidget.foreground': p.text,
      'editorHoverWidget.border': p.border,
      'editorSuggestWidget.background': p.surface,
      'editorSuggestWidget.foreground': p.text,
      'editorSuggestWidget.border': p.border,
      'editorSuggestWidget.selectedBackground': p.selection,
      'focusBorder': p.accent,
      'widget.border': p.border,
    },
  }
}

export function getTerminalTheme(mode) {
  const p = palettes[mode]
  return {
    background: p.canvas,
    foreground: p.text,
    cursor: p.accent,
    cursorAccent: p.canvas,
    selectionBackground: p.selection,
    black: p.muted,
    brightBlack: p.muted,
    red: p.danger,
    brightRed: p.danger,
    green: p.success,
    brightGreen: p.success,
    yellow: p.warning,
    brightYellow: p.warning,
    blue: p.accent,
    brightBlue: p.accent,
    magenta: p.magenta,
    brightMagenta: p.magenta,
    cyan: p.cyan,
    brightCyan: p.cyan,
    white: p.text,
    brightWhite: p.text,
  }
}
