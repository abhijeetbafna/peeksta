import { useState, useRef } from 'react';
import { UserAvatar } from './InstagramChatModal';
import { IconClose, IconDownload, IconCopy, IconZap, IconStar, IconCheckCircle } from './icons';

export default function ChatRecapModal({ isOpen = false, onClose, activeThread, analytics }) {
  const [selectedTheme, setSelectedTheme] = useState('instagram');
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  if (!isOpen || !activeThread || !analytics) return null;

  const themes = {
    instagram: {
      name: 'Instagram Classic',
      bg: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 45%, #F77737 80%, #E1306C 100%)',
      cardBg: 'rgba(0, 0, 0, 0.35)',
      accent: '#FFF',
      text: '#FFF',
      subText: 'rgba(255, 255, 255, 0.85)'
    },
    midnight: {
      name: 'Midnight Cyber',
      bg: 'linear-gradient(135deg, #09090B 0%, #18181B 50%, #27272A 100%)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      accent: '#E1306C',
      text: '#FFF',
      subText: '#A1A1AA'
    },
    sunset: {
      name: 'Sunset Glow',
      bg: 'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)',
      cardBg: 'rgba(0, 0, 0, 0.3)',
      accent: '#FFD700',
      text: '#FFF',
      subText: 'rgba(255, 255, 255, 0.85)'
    },
    emerald: {
      name: 'Emerald Luxe',
      bg: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #10B981 100%)',
      cardBg: 'rgba(0, 0, 0, 0.35)',
      accent: '#6EE7B7',
      text: '#FFF',
      subText: 'rgba(255, 255, 255, 0.85)'
    }
  };

  const theme = themes[selectedTheme] || themes.instagram;

  const {
    totalMsgs,
    meName,
    partnerName,
    meCount,
    partnerCount,
    mePct,
    partnerPct,
    avgResponseTimeMe,
    avgResponseTimePartner,
    peakHourStr,
    peakDayStr,
    topEmojisCombined,
    topKeywords,
    uniqueActiveDays,
    maxStreakDays
  } = analytics;

  const topEmoji = topEmojisCombined && topEmojisCombined[0] ? topEmojisCombined[0][0] : '💬';
  const topWord = topKeywords && topKeywords[0] ? topKeywords[0][0] : 'Chat';

  // Copy text summary to clipboard
  const handleCopySummary = () => {
    const text = `✨ Peeksta Chat Recap for ${activeThread.title} ✨\n\n` +
      `💬 Total Messages: ${totalMsgs.toLocaleString()}\n` +
      `🔥 Day Streak: ${maxStreakDays} Days\n` +
      `📅 Active Days: ${uniqueActiveDays}\n` +
      `📊 Message Split: ${meName} (${mePct}%) vs ${partnerName} (${partnerPct}%)\n` +
      `⚡ Avg Reply Speed: ${meName} (${avgResponseTimeMe}) | ${partnerName} (${avgResponseTimePartner})\n` +
      `⏰ Peak Hour: ${peakHourStr}\n` +
      `📅 Peak Day: ${peakDayStr}\n` +
      `😍 Top Emoji: ${topEmoji}\n` +
      `🔤 Favorite Word: "${topWord}"\n\n` +
      `Generated with Peeksta Instagram Analyzer`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download high-resolution PNG using HTML5 Canvas drawing
  const handleDownloadPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920; // 9:16 Instagram Story Aspect Ratio
    const ctx = canvas.getContext('2d');

    // Draw Background Gradient
    let grad;
    if (selectedTheme === 'instagram') {
      grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, '#833AB4');
      grad.addColorStop(0.45, '#FD1D1D');
      grad.addColorStop(0.8, '#F77737');
      grad.addColorStop(1, '#E1306C');
    } else if (selectedTheme === 'midnight') {
      grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, '#09090B');
      grad.addColorStop(0.5, '#18181B');
      grad.addColorStop(1, '#27272A');
    } else if (selectedTheme === 'sunset') {
      grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, '#FF512F');
      grad.addColorStop(1, '#DD2476');
    } else {
      grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, '#064E3B');
      grad.addColorStop(0.5, '#047857');
      grad.addColorStop(1, '#10B981');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative Orbs / Circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(900, 200, 350, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(150, 1700, 400, 0, Math.PI * 2);
    ctx.fill();

    // Main Card Container Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.roundRect(80, 140, 920, 1640, 48);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Watermark Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PEEKSTA CHAT RECAP', 540, 240);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '500 28px sans-serif';
    ctx.fillText(`Conversation with ${activeThread.title}`, 540, 290);

    // Big Hero Stat
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 96px sans-serif';
    ctx.fillText(totalMsgs.toLocaleString(), 540, 440);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('TOTAL MESSAGES EXCHANGED', 540, 500);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(160, 550);
    ctx.lineTo(920, 550);
    ctx.stroke();

    // Key Stat Cards Grid (4 boxes)
    const drawStatBox = (x, y, w, h, icon, val, label) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.roundRect(x, y, w, h, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${icon} ${val}`, x + w / 2, y + 70);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = '600 24px sans-serif';
      ctx.fillText(label, x + w / 2, y + 115);
    };

    drawStatBox(140, 600, 380, 150, '🔥', `${maxStreakDays} Days`, 'Longest Streak');
    drawStatBox(560, 600, 380, 150, '📅', `${uniqueActiveDays}`, 'Active Days');
    drawStatBox(140, 780, 380, 150, '⏰', peakHourStr, 'Peak Hour');
    drawStatBox(560, 780, 380, 150, '📅', peakDayStr, 'Peak Day');

    // Message Share Ratio Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.roundRect(140, 970, 800, 220, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`💬 Message Volume Split`, 180, 1025);

    // Names & Percentages
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#E1306C';
    ctx.fillText(`${meName}: ${mePct}%`, 180, 1070);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#833AB4';
    ctx.fillText(`${partnerName}: ${partnerPct}%`, 900, 1070);

    // Progress Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.roundRect(180, 1090, 720, 24, 12);
    ctx.fill();

    const meWidth = (720 * mePct) / 100;
    ctx.fillStyle = '#E1306C';
    ctx.roundRect(180, 1090, meWidth, 24, 12);
    ctx.fill();

    ctx.fillStyle = '#833AB4';
    ctx.roundRect(180 + meWidth, 1090, 720 - meWidth, 24, 12);
    ctx.fill();

    // Average Reply Speed Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.roundRect(140, 1230, 800, 170, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⚡ Avg Reply Speed`, 180, 1280);

    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = '#FFF';
    ctx.fillText(`${meName}: ${avgResponseTimeMe}`, 180, 1340);
    ctx.fillText(`${partnerName}: ${avgResponseTimePartner}`, 560, 1340);

    // Top Emoji & Top Word Box
    drawStatBox(140, 1430, 380, 150, topEmoji, 'Top Emoji', 'Most Used');
    drawStatBox(560, 1430, 380, 150, '🔤', `"${topWord}"`, 'Top Keyword');

    // Footer Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Created with Peeksta · 100% Private Client-Side Instagram Analyzer', 540, 1720);

    // Trigger Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Peeksta-Recap-${activeThread.title.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#141414',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>✨</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>
                Chat Recap & Story Card
              </h3>
              <span style={{ fontSize: '11px', color: '#8E8E8E' }}>
                Shareable stats for {activeThread.title}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#262626',
              border: 'none',
              color: '#A8A8A8',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconClose size={15} />
          </button>
        </div>

        {/* Theme Selector Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {Object.keys(themes).map((tKey) => (
            <button
              key={tKey}
              onClick={() => setSelectedTheme(tKey)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: selectedTheme === tKey ? '2px solid #E1306C' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedTheme === tKey ? 'rgba(225, 48, 108, 0.2)' : '#1F1F1F',
                color: selectedTheme === tKey ? '#FFF' : '#A8A8A8',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {themes[tKey].name}
            </button>
          ))}
        </div>

        {/* 9:16 PREVIEW STORY CARD */}
        <div
          ref={cardRef}
          style={{
            background: theme.bg,
            borderRadius: '24px',
            padding: '24px 20px',
            color: theme.text,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Brand Tag */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
              PEEKSTA CHAT RECAP
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '10px' }}>
              100% PRIVATE
            </span>
          </div>

          {/* User Avatars & Names */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <div style={{ display: 'flex', marginLeft: '6px' }}>
              <UserAvatar username={meName} size={42} style={{ border: '2px solid #FFF' }} />
              <UserAvatar username={partnerName} size={42} style={{ marginLeft: '-14px', border: '2px solid #FFF' }} />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#FFF' }}>
                {activeThread.title}
              </h4>
              <span style={{ fontSize: '11px', opacity: 0.85 }}>
                {totalMsgs.toLocaleString()} total messages
              </span>
            </div>
          </div>

          {/* Big Hero Number Card */}
          <div
            style={{
              background: theme.cardBg,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '38px', fontWeight: 900, color: '#FFF', lineHeight: 1 }}>
              {totalMsgs.toLocaleString()}
            </div>
            <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.5px', marginTop: '4px', opacity: 0.9 }}>
              Messages Exchanged
            </div>
          </div>

          {/* 2x2 Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: theme.cardBg, padding: '12px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>🔥 {maxStreakDays} Days</div>
              <div style={{ fontSize: '9.5px', opacity: 0.8, textTransform: 'uppercase', marginTop: '2px' }}>Day Streak</div>
            </div>
            <div style={{ background: theme.cardBg, padding: '12px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>📅 {uniqueActiveDays} Days</div>
              <div style={{ fontSize: '9.5px', opacity: 0.8, textTransform: 'uppercase', marginTop: '2px' }}>Active Days</div>
            </div>
            <div style={{ background: theme.cardBg, padding: '12px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>⏰ {peakHourStr}</div>
              <div style={{ fontSize: '9.5px', opacity: 0.8, textTransform: 'uppercase', marginTop: '2px' }}>Peak Hour</div>
            </div>
            <div style={{ background: theme.cardBg, padding: '12px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>📅 {peakDayStr}</div>
              <div style={{ fontSize: '9.5px', opacity: 0.8, textTransform: 'uppercase', marginTop: '2px' }}>Peak Day</div>
            </div>
          </div>

          {/* Reply Speed & Top Emoji Bar */}
          <div style={{ background: theme.cardBg, padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '9.5px', opacity: 0.8, textTransform: 'uppercase' }}>Avg Reply Speed</div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>
                {meName}: {avgResponseTimeMe}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9.5px', opacity: 0.8, textTransform: 'uppercase' }}>Top Emoji</div>
              <div style={{ fontSize: '20px' }}>{topEmoji}</div>
            </div>
          </div>

          {/* Footer watermark */}
          <div style={{ textAlign: 'center', fontSize: '9.5px', opacity: 0.7, marginTop: '2px' }}>
            Generated with Peeksta · Instagram Chat Studio
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
          <button
            onClick={handleDownloadPNG}
            style={{
              padding: '12px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #E1306C, #833AB4)',
              color: '#FFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(225, 48, 108, 0.4)'
            }}
          >
            <IconDownload size={16} /> Download PNG Card
          </button>

          <button
            onClick={handleCopySummary}
            style={{
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: '#262626',
              color: copied ? '#10B981' : '#FFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {copied ? <IconCheckCircle size={16} /> : <IconCopy size={16} />}
            {copied ? 'Copied Summary!' : 'Copy Text Stats'}
          </button>
        </div>
      </div>
    </div>
  );
}
