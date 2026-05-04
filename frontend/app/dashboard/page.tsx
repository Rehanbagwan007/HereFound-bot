import { createClient } from '@supabase/supabase-js';
import { ReportCard } from './components';

interface ViolationRow {
  id: string;
  reel_url: string;
  reporter_username: string;
  status: string;
  violation_type: string | null;
  it_act_section: string | null;
  confidence: number | null;
  is_ai_generated: boolean | null;
  ai_generation_confidence: number | null;
  cyber_police_draft: string | null;
  created_at: string;
}

// Force dynamic rendering — no static caching
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Use service role key for server-side full access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('flagged_violations')
    .select('id,reel_url,reporter_username,status,violation_type,it_act_section,confidence,is_ai_generated,ai_generation_confidence,cyber_police_draft,created_at')
    .order('created_at', { ascending: false });

  const rows: ViolationRow[] = data ?? [];
  const totalReports = rows.length;
  const flaggedCount = rows.filter((r) => r.status === 'flagged').length;
  const clearedCount = rows.filter((r) => r.status === 'cleared').length;
  const aiGenCount = rows.filter((r) => r.is_ai_generated).length;

  return (
    <main className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-16 flex flex-col items-center py-6 gap-6 z-40" style={{ background: 'rgba(18,18,18,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{ background: 'linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)' }}>
          H
        </div>
        <div className="flex-1 flex flex-col items-center gap-5 mt-4">
          <SidebarIcon active title="Reports">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </SidebarIcon>
          <SidebarIcon title="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </SidebarIcon>
          <SidebarIcon title="Analytics">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </SidebarIcon>
          <SidebarIcon title="Messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </SidebarIcon>
        </div>
        <SidebarIcon title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </SidebarIcon>
      </aside>

      {/* Main */}
      <div className="pl-16">
        {/* Top bar */}
        <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
          <div>
            <h1 className="text-xl font-bold">Reports Dashboard</h1>
            <p className="text-xs text-gray-500">HereFound · Cyber Compliance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(45deg, #833ab4, #fd1d1d)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
          </div>
        </header>

        <div className="px-6 py-6">
          {/* Error banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6b6b' }}>
              ⚠️ Error loading reports: {error.message}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Reports" value={totalReports} color="#fff" />
            <StatCard label="Flagged" value={flaggedCount} color="#ff4444" />
            <StatCard label="Cleared" value={clearedCount} color="#22c55e" />
            <StatCard label="AI Generated" value={aiGenCount} color="#833ab4" />
          </div>

          {/* Section label */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Recent Reports</span>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Grid */}
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'rgba(131,58,180,0.1)', border: '1px solid rgba(131,58,180,0.2)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#833ab4" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </div>
              <p className="text-gray-400 font-medium">No reports yet</p>
              <p className="text-gray-600 text-sm mt-1">Reports will appear here as Reels are analyzed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rows.map((row) => (
                <ReportCard key={row.id} report={row} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function SidebarIcon({ children, active, title }: { children: React.ReactNode; active?: boolean; title: string }) {
  return (
    <button
      title={title}
      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
      style={{
        background: active ? 'linear-gradient(45deg, rgba(131,58,180,0.3), rgba(253,29,29,0.2))' : 'transparent',
        border: active ? '1px solid rgba(131,58,180,0.4)' : '1px solid transparent',
        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value.toLocaleString()}</p>
    </div>
  );
}
