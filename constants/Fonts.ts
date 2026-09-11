export const AVAILABLE_FONTS = [
  { label: 'System Default', value: 'System' },
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Monospace', value: 'monospace' },
];

export const AppFonts = {
  regular: 'sans-serif',
  medium: 'sans-serif-medium',
  semiBold: 'sans-serif-medium',
  bold: 'sans-serif',
} as const;

export const Type = {
  display: { fontFamily: AppFonts.medium, fontSize: 34, lineHeight: 36, letterSpacing: 0 },
  displaySmall: { fontFamily: AppFonts.medium, fontSize: 28, lineHeight: 31, letterSpacing: 0 },
  heading: { fontFamily: AppFonts.medium, fontSize: 20, lineHeight: 24, letterSpacing: 0 },
  eyebrow: { fontFamily: AppFonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: 1.6 },
  body: { fontFamily: AppFonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: AppFonts.semiBold, fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  caption: { fontFamily: AppFonts.medium, fontSize: 12, lineHeight: 17 },
  metric: { fontFamily: AppFonts.medium, fontSize: 32, lineHeight: 36, letterSpacing: 0 },
  label: { fontFamily: AppFonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
} as const;
