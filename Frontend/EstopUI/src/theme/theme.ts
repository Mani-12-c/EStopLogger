import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

// ─── Colour tokens ────────────────────────────────────────────────────────────
// Light: Slate-50 backgrounds, deep navy-blue primary — inspired by enterprise
//        tools (Salesforce, Atlassian, IBM Carbon).
// Dark : Deep slate (NOT pure black) with corporate blue accents — inspired by
//        Grafana / Linear dark themes.
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT = {
  primary:    '#1A56DB',   // IBM / enterprise blue
  primaryDark:'#1342B0',
  bgDefault:  '#F1F5F9',   // Tailwind slate-100
  bgPaper:    '#FFFFFF',
  bgSidebar:  '#FFFFFF',
  textPrimary:'#0F172A',   // slate-900
  textSecond: '#475569',   // slate-600
  divider:    'rgba(15,23,42,0.08)',
  activeNav:  'rgba(26,86,219,0.08)',
  activeNavBorder: '#1A56DB',
  borderCard: 'rgba(15,23,42,0.08)',
};

const DARK = {
  primary:    '#3B82F6',   // blue-500
  primaryDark:'#2563EB',
  bgDefault:  '#0F172A',   // slate-900
  bgPaper:    '#1E293B',   // slate-800
  bgSidebar:  '#1E293B',
  textPrimary:'#F1F5F9',   // slate-100
  textSecond: '#94A3B8',   // slate-400
  divider:    'rgba(241,245,249,0.07)',
  activeNav:  'rgba(59,130,246,0.12)',
  activeNavBorder: '#3B82F6',
  borderCard: 'rgba(241,245,249,0.07)',
};

export function createAppTheme(mode: PaletteMode) {
  const c = mode === 'light' ? LIGHT : DARK;

  return createTheme({
    palette: {
      mode,
      primary:    { main: c.primary, dark: c.primaryDark, contrastText: '#fff' },
      secondary:  { main: mode === 'light' ? '#475569' : '#64748B' },
      background: { default: c.bgDefault, paper: c.bgPaper },
      text:       { primary: c.textPrimary, secondary: c.textSecond },
      error:      { main: '#DC2626' },   // red-600   — consistent across modes
      warning:    { main: '#D97706' },   // amber-600
      success:    { main: '#16A34A' },   // green-600
      info:       { main: c.primary },
      divider:    c.divider,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600, color: c.textSecond },
      body2: { color: c.textSecond },
      overline: {
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: c.textSecond,
      },
    },
    shape: { borderRadius: 8 },
    shadows: [
      'none',
      mode === 'light'
        ? '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)'
        : '0 1px 3px rgba(0,0,0,0.35)',
      mode === 'light'
        ? '0 4px 6px -1px rgba(15,23,42,0.07), 0 2px 4px -1px rgba(15,23,42,0.04)'
        : '0 4px 6px rgba(0,0,0,0.4)',
      ...Array(22).fill('none'),
    ] as any,
    components: {
      // ── Card ────────────────────────────────────────────────────────────────
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${c.borderCard}`,
            transition: 'box-shadow 0.2s, border-color 0.2s',
            '&:hover': {
              boxShadow: mode === 'light'
                ? '0 4px 12px rgba(15,23,42,0.08)'
                : '0 4px 12px rgba(0,0,0,0.4)',
              borderColor: mode === 'light'
                ? 'rgba(26,86,219,0.2)'
                : 'rgba(59,130,246,0.25)',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: '20px 24px', '&:last-child': { paddingBottom: 20 } },
        },
      },
      // ── Buttons ─────────────────────────────────────────────────────────────
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 6,
            fontSize: '0.875rem',
          },
          contained: {
            '&.MuiButton-containedPrimary': {
              background: c.primary,
              '&:hover': { background: c.primaryDark },
            },
          },
          outlined: {
            '&.MuiButton-outlinedPrimary': {
              borderColor: mode === 'light'
                ? 'rgba(26,86,219,0.4)'
                : 'rgba(59,130,246,0.4)',
            },
          },
        },
      },
      // ── Chip ────────────────────────────────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 4, fontSize: '0.75rem' },
        },
      },
      // ── Table ───────────────────────────────────────────────────────────────
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            color: c.textSecond,
            backgroundColor: mode === 'light' ? '#F8FAFC' : '#162032',
            borderBottom: `1px solid ${c.divider}`,
          },
          body: {
            borderBottom: `1px solid ${c.divider}`,
            fontSize: '0.875rem',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: mode === 'light'
                ? 'rgba(26,86,219,0.03)'
                : 'rgba(59,130,246,0.04)',
            },
          },
        },
      },
      // ── Sidebar / Drawer ─────────────────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: c.bgSidebar,
            borderRight: `1px solid ${c.divider}`,
            boxShadow: mode === 'light'
              ? '2px 0 8px rgba(15,23,42,0.04)'
              : 'none',
          },
        },
      },
      // ── AppBar ──────────────────────────────────────────────────────────────
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: c.bgPaper,
            borderBottom: `1px solid ${c.divider}`,
            backgroundImage: 'none',
            color: c.textPrimary,
          },
        },
      },
      // ── Inputs ──────────────────────────────────────────────────────────────
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: mode === 'light' ? '#fff' : 'rgba(255,255,255,0.04)',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: c.divider,
          },
        },
      },
      // ── Dialog ──────────────────────────────────────────────────────────────
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            border: `1px solid ${c.divider}`,
          },
        },
      },
      // ── Paper ───────────────────────────────────────────────────────────────
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      // ── Tabs ────────────────────────────────────────────────────────────────
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
        },
      },
      // ── Tooltip ─────────────────────────────────────────────────────────────
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'light' ? '#1E293B' : '#334155',
            fontSize: '0.75rem',
            borderRadius: 4,
          },
        },
      },
    },
  });
}

// Default export keeps backward compat for any stray imports
export default createAppTheme('dark');
