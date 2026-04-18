import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabase } from '../../lib/supabaseClient';

interface ViolationRow {
  id: string;
  reel_url: string;
  reporter_username: string;
  status: string;
  violation_type: string | null;
  it_act_section: string | null;
  confidence: number | null;
  created_at: string;
}

export default async function DashboardPage() {
  const supabaseServer = createServerComponentClient({ cookies });
  const { data, error } = await supabaseServer
    .from('flagged_violations')
    .select('id,reel_url,reporter_username,status,violation_type,it_act_section,confidence,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-6 text-red-300">Error loading violations: {error.message}</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold mb-4">Organization Dashboard</h1>
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 p-4">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead>
              <tr>
                <th className="border-b border-slate-700 px-3 py-2">Report</th>
                <th className="border-b border-slate-700 px-3 py-2">Reporter</th>
                <th className="border-b border-slate-700 px-3 py-2">Violation</th>
                <th className="border-b border-slate-700 px-3 py-2">Section</th>
                <th className="border-b border-slate-700 px-3 py-2">Confidence</th>
                <th className="border-b border-slate-700 px-3 py-2">Status</th>
                <th className="border-b border-slate-700 px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row: ViolationRow) => (
                <tr key={row.id} className="border-t border-slate-700">
                  <td className="px-3 py-2 break-all">{row.reel_url}</td>
                  <td className="px-3 py-2">{row.reporter_username}</td>
                  <td className="px-3 py-2">{row.violation_type || 'N/A'}</td>
                  <td className="px-3 py-2">{row.it_act_section || 'N/A'}</td>
                  <td className="px-3 py-2">{row.confidence ?? '—'}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
