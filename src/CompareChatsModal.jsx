import { useMemo, useState } from 'react';
import { computeThreadAnalytics } from './analyticsParser';
import { IconClose } from './icons';

// The account owner is the sender who appears in the most conversations.
function detectOwnerName(threads) {
  const counts = new Map();
  for (const t of threads) {
    const senders = new Set((t.messages || []).map((m) => m.sender).filter(Boolean));
    for (const s of senders) counts.set(s, (counts.get(s) || 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [name, c] of counts) {
    if (c > bestCount) {
      best = name;
      bestCount = c;
    }
  }
  return bestCount > 1 ? best : '';
}

function parseDurationToSec(str) {
  if (!str || str === 'N/A') return null;
  if (str.endsWith('h')) return parseFloat(str) * 3600;
  const m = str.match(/(?:(\d+)m)?\s*(?:(\d+)s)?/);
  if (!m) return null;
  return (parseInt(m[1] || '0', 10) * 60) + parseInt(m[2] || '0', 10);
}

export default function CompareChatsModal({ isOpen, onClose, threads = [], isDark = true, colors }) {
  const ownerName = useMemo(() => detectOwnerName(threads), [threads]);
  const [leftKey, setLeftKey] = useState(threads[0]?.threadKey || '');
  const [rightKey, setRightKey] = useState(threads[1]?.threadKey || '');

  const leftThread = threads.find((t) => t.threadKey === leftKey) || threads[0] || null;
  const rightThread = threads.find((t) => t.threadKey === rightKey) || threads[1] || null;

  const left = useMemo(() => (leftThread ? computeThreadAnalytics(leftThread, ownerName) : null), [leftThread, ownerName]);
  const right = useMemo(() => (rightThread ? computeThreadAnalytics(rightThread, ownerName) : null), [rightThread, ownerName]);

  if (!isOpen) return null;

  const palette = colors || {
    cardBg: isDark ? '#141414' : '#FFFFFF',
    cardInnerBg: isDark ? '#1F1F1F' : '#E5E7EB',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#8E8E8E' : '#6B7280',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
  };

  const busiestMonth = (a) => {
    const list = a?.monthlyCounts || [];
    if (!list.length) return null;
    return list.reduce((best, m) => (m.count > best.count ? m : best), list[0]);
  };

  // higher: 'high' = bigger wins, 'low' = smaller wins, null = no winner
  const rows = [
    { label: 'Total messages', get: (a) => a.totalMsgs, fmt: (v) => v.toLocaleString(), higher: 'high' },
    { label: 'Active days', get: (a) => a.uniqueActiveDays, fmt: (v) => v.toLocaleString(), higher: 'high' },
    { label: 'Longest daily streak', get: (a) => a.maxStreakDays, fmt: (v) => `${v} days`, higher: 'high' },
    { label: 'First message', get: (a) => a.firstMsgDate, fmt: (v) => v, higher: null },
    { label: 'Busiest month', get: (a) => busiestMonth(a), fmt: (v) => (v ? `${v.label} (${v.count})` : '—'), higher: null },
    { label: 'Your share of messages', get: (a) => a.mePct, fmt: (v) => `${v}%`, higher: null },
    { label: 'Your avg reply time', get: (a) => parseDurationToSec(a.avgResponseTimeMe), fmt: (_v, a) => a.avgResponseTimeMe, higher: 'low' },
    { label: 'Their avg reply time', get: (a) => parseDurationToSec(a.avgResponseTimePartner), fmt: (_v, a) => a.avgResponseTimePartner, higher: 'low' },
    { label: 'Late-night messages', get: (a) => a.lateNightTotal, fmt: (v) => v.toLocaleString(), higher: 'high' },
    { label: 'Laugh moments', get: (a) => (a.laughterMe || 0) + (a.laughterPartner || 0), fmt: (v) => v.toLocaleString(), higher: 'high' },
    { label: 'Photos shared', get: (a) => (a.photosMe || 0) + (a.photosPartner || 0), fmt: (v) => v.toLocaleString(), higher: 'high' },
    { label: 'Reels shared', get: (a) => (a.reelsMe || 0) + (a.reelsPartner || 0), fmt: (v) => v.toLocaleString(), higher: 'high' }
  ];

  const selectStyle = {
    width: '100%',
    background: palette.cardInnerBg,
    border: `1px solid ${palette.border}`,
    color: palette.textPrimary,
    padding: '10px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 700,
    outline: 'none',
    cursor: 'pointer'
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: palette.cardBg,
          border: `1px solid ${palette.border}`,
          borderRadius: '20px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${palette.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.12), rgba(131, 58, 180, 0.12))'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: palette.textPrimary }}>⚖️ Compare Chats</h3>
            <div style={{ fontSize: '11.5px', color: palette.textSecondary, marginTop: '2px' }}>
              Side-by-side stats for any two conversations{ownerName ? ` · you are “${ownerName}”` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: palette.cardInnerBg,
              border: `1px solid ${palette.border}`,
              color: palette.textPrimary,
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <IconClose size={15} />
          </button>
        </div>

        {threads.length < 2 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: palette.textSecondary, fontSize: '13px' }}>
            Upload at least two conversations to compare them.
          </div>
        ) : (
          <div style={{ padding: '18px 20px 22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <select value={leftThread?.threadKey || ''} onChange={(e) => setLeftKey(e.target.value)} style={{ ...selectStyle, borderColor: 'rgba(225, 48, 108, 0.5)' }}>
                {threads.map((t) => (
                  <option key={t.threadKey} value={t.threadKey} style={{ background: palette.cardBg }}>{t.title}</option>
                ))}
              </select>
              <select value={rightThread?.threadKey || ''} onChange={(e) => setRightKey(e.target.value)} style={{ ...selectStyle, borderColor: 'rgba(131, 58, 180, 0.5)' }}>
                {threads.map((t) => (
                  <option key={t.threadKey} value={t.threadKey} style={{ background: palette.cardBg }}>{t.title}</option>
                ))}
              </select>
            </div>

            {left && right ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rows.map((row) => {
                  const lv = row.get(left);
                  const rv = row.get(right);
                  let leftWins = false;
                  let rightWins = false;
                  if (row.higher && typeof lv === 'number' && typeof rv === 'number' && lv !== rv) {
                    if (row.higher === 'high') {
                      leftWins = lv > rv;
                      rightWins = rv > lv;
                    } else {
                      leftWins = lv < rv;
                      rightWins = rv < lv;
                    }
                  }
                  const cell = (val, a, wins, color) => (
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: '13px',
                        fontWeight: wins ? 800 : 600,
                        color: wins ? color : palette.textPrimary,
                        background: wins ? `${color}22` : 'transparent',
                        borderRadius: '8px',
                        padding: '4px 6px'
                      }}
                    >
                      {val === null || val === undefined ? 'N/A' : row.fmt(val, a)}
                      {wins ? ' 🏆' : ''}
                    </div>
                  );
                  return (
                    <div
                      key={row.label}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.1fr 1fr',
                        alignItems: 'center',
                        gap: '8px',
                        background: palette.cardInnerBg,
                        borderRadius: '10px',
                        padding: '8px 10px'
                      }}
                    >
                      {cell(lv, left, leftWins, '#E1306C')}
                      <div style={{ textAlign: 'center', fontSize: '11px', color: palette.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {row.label}
                      </div>
                      {cell(rv, right, rightWins, '#833AB4')}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: palette.textSecondary, fontSize: '12.5px' }}>
                Not enough messages in one of these chats to compare.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
