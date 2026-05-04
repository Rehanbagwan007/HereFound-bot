import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'HereFound — Cyber Compliance Dashboard',
  description: 'Automated IT Act compliance and deepfake detection for digital sports media.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, sans-serif', background: '#0a0a0a', color: '#fff', margin: 0 }}>{children}</body>
    </html>
  );
}
