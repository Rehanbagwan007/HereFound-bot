import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-semibold mb-4">HereFound</h1>
        <p className="text-slate-300 mb-8">
          Automated IT Act compliance and deepfake detection for digital sports media.
        </p>
        <div className="space-x-4">
          <Link className="rounded bg-sky-600 px-4 py-2 hover:bg-sky-500" href="/dashboard">
            Organization Dashboard
          </Link>
          <Link className="rounded border border-slate-600 px-4 py-2 hover:bg-slate-800" href="/public-report/your-report-id">
            Public Reporter View
          </Link>
          <Link className="rounded border border-slate-600 px-4 py-2 hover:bg-slate-800" href="/privacy">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
