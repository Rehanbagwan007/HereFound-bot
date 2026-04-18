import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { CopyDraftButton } from './CopyDraftButton';

interface ReportPageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { cookies }
  );
  const { data, error } = await supabaseServer
    .from('flagged_violations')
    .select('id,reel_url,reporter_username,status,violation_type,it_act_section,confidence,cyber_police_draft')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return <div className="min-h-screen bg-slate-950 text-white p-6">Report not found.</div>;
  }

  const draft = data.cyber_police_draft || 'No complaint draft available.';

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-semibold">Public Report</h1>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
          <p className="text-slate-300 mb-2">Reel URL</p>
          <a className="text-sky-400 break-all" href={data.reel_url} target="_blank" rel="noreferrer">
            {data.reel_url}
          </a>
          <p className="mt-4 text-slate-300">Reporter</p>
          <p className="text-white">{data.reporter_username}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-300">
            <div>
              <p>Violation</p>
              <p className="text-white">{data.violation_type || 'N/A'}</p>
            </div>
            <div>
              <p>IT Act Section</p>
              <p className="text-white">{data.it_act_section || 'N/A'}</p>
            </div>
            <div>
              <p>Confidence</p>
              <p className="text-white">{data.confidence ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold mb-3">Cyber Police Complaint Draft</h2>
          <pre className="whitespace-pre-wrap rounded bg-slate-950 p-4 text-sm text-slate-100">{draft}</pre>
          <CopyDraftButton draft={draft} />
        </div>
      </div>
    </main>
  );
}
