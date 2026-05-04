import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from './theme';

export const metadata: Metadata = {
  title: 'HereFound — Cyber Compliance Dashboard',
  description: 'Automated IT Act compliance and deepfake detection for digital sports media.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body style={{ fontFamily: 'Inter, sans-serif', margin: 0 }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
