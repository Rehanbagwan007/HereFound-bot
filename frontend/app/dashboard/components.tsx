'use client';

import { useState, useRef, useEffect } from 'react';

interface Report {
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatPanelProps {
  report: Report;
  onClose: () => void;
}

export function AIChatPanel({ report, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm analyzing report **#${report.id.slice(0, 8)}**.\n\n**Status:** ${report.status === 'flagged' ? '🚨 Violation Detected' : '✅ Clean'}\n**Violation:** ${report.violation_type || 'None'}\n**IT Act Section:** ${report.it_act_section || 'N/A'}\n**Confidence:** ${report.confidence ?? 'N/A'}%\n**AI Generated:** ${report.is_ai_generated ? `Yes (${report.ai_generation_confidence}%)` : 'No'}\n\nAsk me anything about this report!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = `
Report ID: ${report.id}
Reel URL: ${report.reel_url}
Reporter: ${report.reporter_username}
Status: ${report.status}
Violation Type: ${report.violation_type || 'None'}
IT Act Section: ${report.it_act_section || 'N/A'}
Confidence: ${report.confidence ?? 'N/A'}%
AI Generated: ${report.is_ai_generated ? `Yes (${report.ai_generation_confidence}% confidence)` : 'No'}
Complaint Draft: ${report.cyber_police_draft || 'N/A'}
Date: ${new Date(report.created_at).toLocaleString()}
      `.trim();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: trimmed },
          ],
          reportContext: context,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I could not process that.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Failed to get a response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-6 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-md h-[600px] flex flex-col rounded-2xl overflow-hidden slide-up"
        style={{ background: 'var(--chat-bg)', border: '1px solid var(--chat-border)', boxShadow: '0 25px 60px rgba(131,58,180,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--divider)', background: 'var(--chat-header-bg)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(45deg, #833ab4, #fd1d1d)' }}>
            AI
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>HereFound AI Assistant</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Report #{report.id.slice(0, 8)}</div>
          </div>
          <button onClick={onClose} className="transition-colors text-xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hidden">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2 flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(45deg, #833ab4, #fd1d1d)' }}>F</div>
              )}
              <div
                className="max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  msg.role === 'user'
                    ? { background: 'linear-gradient(45deg, #833ab4, #fd1d1d)', borderBottomRightRadius: 4, color: '#fff' }
                    : { background: 'var(--chat-msg-bg)', border: '1px solid var(--chat-msg-border)', borderBottomLeftRadius: 4, color: 'var(--text-primary)' }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2 flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(45deg, #833ab4, #fd1d1d)' }}>F</div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--chat-msg-bg)', border: '1px solid var(--chat-msg-border)' }}>
                <span className="typing-dot inline-block w-2 h-2 rounded-full bg-gray-400 mr-1" />
                <span className="typing-dot inline-block w-2 h-2 rounded-full bg-gray-400 mr-1" />
                <span className="typing-dot inline-block w-2 h-2 rounded-full bg-gray-400" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: 'var(--divider)' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about this report..."
            className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none transition-all"
            style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(45deg, #833ab4, #fd1d1d)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Confidence Ring SVG
function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">{value}%</text>
    </svg>
  );
}

export function ReportCard({ report }: { report: Report }) {
  const [chatOpen, setChatOpen] = useState(false);
  const isViolation = report.status === 'flagged';
  const conf = report.confidence ?? 0;
  const confColor = conf >= 70 ? '#ff4444' : conf >= 40 ? '#fcb045' : '#22c55e';

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
        style={{
          background: 'var(--card-bg)',
          border: `1px solid ${isViolation ? 'rgba(255,68,68,0.25)' : 'rgba(34,197,94,0.2)'}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Thumbnail */}
        <div className="relative h-40 flex items-center justify-center" style={{ background: 'rgba(131,58,180,0.08)' }}>
          <div className="absolute inset-0" style={{ background: isViolation ? 'linear-gradient(135deg, rgba(255,68,68,0.08), transparent)' : 'linear-gradient(135deg, rgba(34,197,94,0.06), transparent)' }} />
          <a href={report.reel_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </div>
          </a>
          {/* Status badge */}
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold`} style={{ background: isViolation ? 'rgba(255,68,68,0.2)' : 'rgba(34,197,94,0.2)', border: `1px solid ${isViolation ? 'rgba(255,68,68,0.4)' : 'rgba(34,197,94,0.4)'}` }}>
            <span className={`w-1.5 h-1.5 rounded-full ${isViolation ? 'pulse-ring' : ''}`} style={{ background: isViolation ? '#ff4444' : '#22c55e' }} />
            {isViolation ? 'VIOLATION' : 'CLEAR'}
          </div>
          {/* AI badge */}
          {report.is_ai_generated && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(131,58,180,0.3)', border: '1px solid rgba(131,58,180,0.5)' }}>
              🤖 AI
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Violation Type</p>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{report.violation_type || 'None Detected'}</p>
              {report.it_act_section && <p className="text-xs mt-0.5" style={{ color: '#833ab4' }}>{report.it_act_section}</p>}
            </div>
            <ConfidenceRing value={conf} color={confColor} />
          </div>

          {/* Reporter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(45deg, #833ab4, #fd1d1d)' }}>
                {(report.reporter_username || '?')[0].toUpperCase()}
              </div>
              <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-secondary)' }}>@{report.reporter_username}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(report.created_at).toLocaleDateString()}</span>
          </div>

          {/* Ask AI button */}
          <button
            onClick={() => setChatOpen(true)}
            className="mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(45deg, rgba(131,58,180,0.3), rgba(253,29,29,0.2))', border: '1px solid rgba(131,58,180,0.4)' }}
          >
            ✨ Ask AI Assistant
          </button>
        </div>
      </div>

      {chatOpen && <AIChatPanel report={report} onClose={() => setChatOpen(false)} />}
    </>
  );
}
