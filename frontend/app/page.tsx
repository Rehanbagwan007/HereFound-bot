import Link from 'next/link';
import { ThemeToggleButton } from './theme';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: '#833ab4' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: '#fd1d1d' }} />

      {/* Top Right Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggleButton />
      </div>

      <div className="z-10 w-full max-w-xl slide-up">
        <div className="glass-card rounded-3xl p-10 md:p-14 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {/* Logo */}
          <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center font-black text-4xl text-white mb-6 shadow-xl" style={{ background: 'var(--ig-gradient)' }}>
            H
          </div>

          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Here<span className="ig-gradient-text">Found</span>
          </h1>
          
          <p className="text-lg md:text-xl mb-10 leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
            Automated IT Act compliance and deepfake detection for digital sports media.
          </p>

          <div className="flex flex-col gap-4">
            <Link
              href="/dashboard"
              className="relative w-full rounded-2xl px-6 py-4 font-bold text-white text-lg transition-all hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 z-0" style={{ background: 'var(--ig-gradient)' }} />
              <span className="relative z-10 flex items-center gap-2">
                Organization Dashboard
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </span>
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/public-report/your-report-id"
                className="rounded-2xl px-6 py-4 font-semibold text-sm transition-all hover:scale-[1.02] flex items-center justify-center"
                style={{ background: 'var(--empty-icon-bg)', border: '1px solid var(--empty-icon-border)', color: 'var(--text-primary)' }}
              >
                Public Reporter View
              </Link>
              
              <Link
                href="/privacy"
                className="rounded-2xl px-6 py-4 font-semibold text-sm transition-all hover:scale-[1.02] flex items-center justify-center"
                style={{ background: 'var(--empty-icon-bg)', border: '1px solid var(--empty-icon-border)', color: 'var(--text-primary)' }}
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-8 font-medium" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} HereFound. All rights reserved.
        </p>
      </div>
    </main>
  );
}
