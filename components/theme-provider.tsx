'use client'

import * as React from 'react'
// TODO: Install next-themes package
// import {
//   ThemeProvider as NextThemesProvider,
//   type ThemeProviderProps,
// } from 'next-themes'

type ThemeProviderProps = {
  children: React.ReactNode;
  [key: string]: any;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Temporary fallback until next-themes is installed
  return <>{children}</>;
}
