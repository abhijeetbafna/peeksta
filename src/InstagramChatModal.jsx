import { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { parseMessageThread, mergeThreadsList, isReelMessage, computeThreadAnalytics } from './analyticsParser';
import ChatRecapModal from './ChatRecapModal';
import {
  IconMessage,
  IconClose,
  IconSearch,
  IconImage,
  IconVideo,
  IconMusic,
  IconPlay,
  IconPause,
  IconArrowUpRight,
  IconUpload,
  IconZap,
  IconUsers,
  IconStar
} from './icons';

// Clean handle logic for live Instagram profile picture lookup
function getCleanHandle(nameStr) {
  if (!nameStr) return '';
  const s = String(nameStr).trim();
  const match = s.match(/@?([a-zA-Z0-9_.]+)/);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return s.toLowerCase().replace(/[\s(),]+/g, '');
}

// UserAvatar Component: Fetches real-time profile pictures from Instagram with initial fallback
export function UserAvatar({ username, title, size = 38, style = {}, isDark = true }) {
  const [imgError, setImgError] = useState(false);
  const handle = getCleanHandle(username || title);
  
  const initials = (title || username || 'IG')
    .split(/[\s._]+/)
    .map(n => n[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const avatarUrl = handle ? `https://unavatar.io/instagram/${handle}` : null;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        padding: '2px',
        background: 'linear-gradient(135deg, #F9CE34 0%, #EE2A7B 50%, #6228D7 100%)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style
      }}
      title={title || username || 'Instagram User'}
    >
      {!imgError && avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username || title || 'User avatar'}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: isDark ? '#1A1A1A' : '#E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#FFF' : '#111827',
            fontWeight: 700,
            fontSize: `${Math.max(10, Math.floor(size * 0.35))}px`
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

// ThreadAnalyticsView Component: Renders visual conversation metrics, timeline milestones, text length averages, reply speeds & top emojis
export function ThreadAnalyticsView({ analytics, thread, onOpenRecap, onJumpToMessage, colors, isDark = true }) {
  const palette = colors || {
    cardBg: isDark ? '#141414' : '#FFFFFF',
    cardInnerBg: isDark ? '#1F1F1F' : '#F3F4F6',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#8E8E8E' : '#6B7280',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
  };

  if (!analytics) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: palette.textSecondary }}>
        <IconZap size={36} style={{ color: '#E1306C', marginBottom: '12px' }} />
        <h4 style={{ fontSize: '15px', color: palette.textPrimary, marginBottom: '6px' }}>No Analytics Available</h4>
        <p style={{ fontSize: '12.5px' }}>Not enough message history to calculate analytics for this conversation.</p>
      </div>
    );
  }

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
    hourlyCounts,
    peakHourStr,
    dayCounts,
    dayNames,
    peakDayStr,
    topEmojisCombined,
    topKeywords,
    uniqueActiveDays,
    maxStreakDays,
    firstMsgDate,
    firstMsgTime,
    firstMsgId,
    firstMsgSender,
    lastMsgDate,
    lastMsgTime,
    lastMsgId,
    lastMsgSender,
    peakDateStr,
    peakDateCount,
    peakDateMsgId,
    avgCharsMe,
    avgWordsMe,
    avgCharsPartner,
    avgWordsPartner,
    lateNightCountMe,
    lateNightCountPartner,
    lateNightTotal,
    initiationsMe,
    initiationsPartner,
    reelsMe,
    reelsPartner,
    photosMe,
    photosPartner
  } = analytics;

  const maxHourVal = Math.max(...hourlyCounts, 1);
  const maxDayVal = Math.max(...dayCounts, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 4px 30px 4px' }}>
      
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.15) 0%, rgba(131, 58, 180, 0.15) 100%)',
          border: '1px solid rgba(225, 48, 108, 0.3)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: palette.textPrimary, margin: 0 }}>
              Conversation Insights
            </h3>
          </div>
          <p style={{ fontSize: '12.5px', color: palette.textSecondary, margin: 0 }}>
            Deep analytics for <strong>{thread.title}</strong> across {totalMsgs.toLocaleString()} messages
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onOpenRecap && (
            <button
              onClick={onOpenRecap}
              style={{
                background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                border: 'none',
                color: '#FFF',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(225, 48, 108, 0.4)'
              }}
            >
              ✨ Story Recap Card
            </button>
          )}

          <div
            style={{
              background: palette.cardInnerBg,
              border: `1px solid ${palette.border}`,
              borderRadius: '12px',
              padding: '10px 14px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#E1306C' }}>{maxStreakDays} 🔥</div>
            <div style={{ fontSize: '10px', color: palette.textSecondary, textTransform: 'uppercase', fontWeight: 700 }}>Day Streak</div>
          </div>
          <div
            style={{
              background: palette.cardInnerBg,
              border: `1px solid ${palette.border}`,
              borderRadius: '12px',
              padding: '10px 14px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#833AB4' }}>{uniqueActiveDays} 📅</div>
            <div style={{ fontSize: '10px', color: palette.textSecondary, textTransform: 'uppercase', fontWeight: 700 }}>Active Days</div>
          </div>
        </div>
      </div>

      {/* Timeline Milestones & Jump Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* Card: First Message Date */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#E1306C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🚀</span> First Conversation Date
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: palette.textPrimary }}>
              {firstMsgDate}
            </div>
            <div style={{ fontSize: '11.5px', color: palette.textSecondary, marginTop: '2px' }}>
              {firstMsgTime} {firstMsgSender ? `• by ${firstMsgSender}` : ''}
            </div>
          </div>

          {onJumpToMessage && firstMsgId && (
            <button
              onClick={() => onJumpToMessage(firstMsgId)}
              style={{
                marginTop: '14px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(225, 48, 108, 0.4)',
                background: 'rgba(225, 48, 108, 0.12)',
                color: '#E1306C',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>↑ Jump to 1st Message</span>
            </button>
          )}
        </div>

        {/* Card: Peak Activity Record Day */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔥</span> Record Peak Day
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: palette.textPrimary }}>
              {peakDateStr}
            </div>
            <div style={{ fontSize: '11.5px', color: '#F59E0B', marginTop: '2px', fontWeight: 600 }}>
              {peakDateCount} messages sent in 24 hours
            </div>
          </div>

          {onJumpToMessage && (peakDateMsgId || peakDateStr) && (
            <button
              onClick={() => onJumpToMessage(peakDateMsgId, peakDateStr)}
              style={{
                marginTop: '14px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#D97706',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>⚡ Jump to Peak Date</span>
            </button>
          )}
        </div>

        {/* Card: Latest Conversation Date */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#833AB4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📌</span> Latest Conversation Date
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: palette.textPrimary }}>
              {lastMsgDate}
            </div>
            <div style={{ fontSize: '11.5px', color: palette.textSecondary, marginTop: '2px' }}>
              {lastMsgTime} {lastMsgSender ? `• by ${lastMsgSender}` : ''}
            </div>
          </div>

          {onJumpToMessage && (lastMsgId || lastMsgDate) && (
            <button
              onClick={() => onJumpToMessage(lastMsgId, lastMsgDate)}
              style={{
                marginTop: '14px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(131, 58, 180, 0.4)',
                background: 'rgba(131, 58, 180, 0.12)',
                color: '#833AB4',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>↓ Jump to Latest Message</span>
            </button>
          )}
        </div>

      </div>

      {/* Grid Row 2: Message Ratio, Average Text Length, Reply Speeds */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Card 1: Message Share & Average Length */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💬</span> Message Volume & Length Analysis
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px' }}>
            <span style={{ color: '#E1306C', fontWeight: 700 }}>{meName}: {meCount} ({mePct}%)</span>
            <span style={{ color: '#833AB4', fontWeight: 700 }}>{partnerName}: {partnerCount} ({partnerPct}%)</span>
          </div>

          <div
            style={{
              height: '12px',
              borderRadius: '6px',
              overflow: 'hidden',
              background: palette.cardInnerBg,
              display: 'flex',
              marginBottom: '16px'
            }}
          >
            <div style={{ width: `${mePct}%`, background: '#E1306C', transition: 'width 0.5s ease' }} />
            <div style={{ width: `${partnerPct}%`, background: '#833AB4', transition: 'width 0.5s ease' }} />
          </div>

          {/* Average Text Length Comparison Box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
            <div style={{ background: palette.cardInnerBg, padding: '12px', borderRadius: '12px', borderLeft: '3px solid #E1306C' }}>
              <div style={{ fontSize: '10.5px', color: palette.textSecondary, fontWeight: 600 }}>{meName} Avg Length</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: palette.textPrimary, marginTop: '2px' }}>
                {avgWordsMe} <span style={{ fontSize: '11px', color: palette.textSecondary, fontWeight: 400 }}>words ({avgCharsMe} chars)</span>
              </div>
            </div>

            <div style={{ background: palette.cardInnerBg, padding: '12px', borderRadius: '12px', borderLeft: '3px solid #833AB4' }}>
              <div style={{ fontSize: '10.5px', color: palette.textSecondary, fontWeight: 600 }}>{partnerName} Avg Length</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: palette.textPrimary, marginTop: '2px' }}>
                {avgWordsPartner} <span style={{ fontSize: '11px', color: palette.textSecondary, fontWeight: 400 }}>words ({avgCharsPartner} chars)</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: palette.textSecondary, marginTop: '12px', textAlign: 'center', fontWeight: 500 }}>
            {avgWordsMe > avgWordsPartner
              ? `📝 ${meName} writes ${Math.round(((avgWordsMe - avgWordsPartner) / (avgWordsPartner || 1)) * 100)}% longer texts on average.`
              : avgWordsPartner > avgWordsMe
              ? `📝 ${partnerName} writes ${Math.round(((avgWordsPartner - avgWordsMe) / (avgWordsMe || 1)) * 100)}% longer texts on average.`
              : '📝 Both participants send equally detailed messages!'}
          </div>
        </div>

        {/* Card 2: Reply Speed & Night Owl Index */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span> Reply Speed & Dynamics
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: palette.cardInnerBg, borderRadius: '12px', padding: '12px', borderLeft: '3px solid #E1306C' }}>
                <div style={{ fontSize: '11px', color: palette.textSecondary, fontWeight: 600 }}>{meName} Reply Speed</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: palette.textPrimary, marginTop: '2px' }}>
                  {avgResponseTimeMe}
                </div>
              </div>

              <div style={{ background: palette.cardInnerBg, borderRadius: '12px', padding: '12px', borderLeft: '3px solid #833AB4' }}>
                <div style={{ fontSize: '11px', color: palette.textSecondary, fontWeight: 600 }}>{partnerName} Reply Speed</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: palette.textPrimary, marginTop: '2px' }}>
                  {avgResponseTimePartner}
                </div>
              </div>
            </div>

            {/* Late Night & Conversation Starters with Explicit Name Tags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: palette.cardInnerBg, borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '10.5px', color: palette.textSecondary, fontWeight: 600, marginBottom: '4px' }}>🌙 Late Night (12–6 AM)</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#F59E0B' }}>
                  {lateNightTotal} <span style={{ fontSize: '11px', color: palette.textSecondary, fontWeight: 400 }}>msgs</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', color: '#E1306C', fontWeight: 700, background: 'rgba(225, 48, 108, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    {meName}: {lateNightCountMe}
                  </span>
                  <span style={{ fontSize: '10px', color: '#833AB4', fontWeight: 700, background: 'rgba(131, 58, 180, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    {partnerName}: {lateNightCountPartner}
                  </span>
                </div>
              </div>

              <div style={{ background: palette.cardInnerBg, borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '10.5px', color: palette.textSecondary, fontWeight: 600, marginBottom: '4px' }}>💬 Chat Starters (&gt;4h break)</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981' }}>
                  {initiationsMe + initiationsPartner} <span style={{ fontSize: '11px', color: palette.textSecondary, fontWeight: 400 }}>starts</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', color: '#E1306C', fontWeight: 700, background: 'rgba(225, 48, 108, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    {meName}: {initiationsMe}
                  </span>
                  <span style={{ fontSize: '10px', color: '#833AB4', fontWeight: 700, background: 'rgba(131, 58, 180, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    {partnerName}: {initiationsPartner}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Grid Row 3: Peak Hours & Days Heatmaps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Peak Hours Histogram */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⏰</span> Peak Hours Heatmap
            </div>
            <span style={{ fontSize: '10.5px', color: '#E1306C', fontWeight: 700, background: 'rgba(225, 48, 108, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
              Peak: {peakHourStr}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '90px', paddingTop: '10px' }}>
            {hourlyCounts.map((count, hIdx) => {
              const hPct = Math.round((count / maxHourVal) * 100);
              const isPeak = count === maxHourVal && count > 0;
              return (
                <div
                  key={hIdx}
                  title={`${hIdx}:00 - ${count} messages`}
                  style={{
                    flex: 1,
                    height: `${Math.max(hPct, 6)}%`,
                    background: isPeak ? 'linear-gradient(to top, #E1306C, #FD1D1D)' : palette.cardInnerBg,
                    borderRadius: '3px 3px 0 0',
                    transition: 'all 0.2s ease'
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: palette.textSecondary, marginTop: '6px' }}>
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </div>

        {/* Peak Days Bar Chart */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📅</span> Activity by Day of Week
            </div>
            <span style={{ fontSize: '10.5px', color: '#833AB4', fontWeight: 700, background: 'rgba(131, 58, 180, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
              Peak: {peakDayStr}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '90px', paddingTop: '10px' }}>
            {dayCounts.map((count, dIdx) => {
              const dPct = Math.round((count / maxDayVal) * 100);
              const isPeak = count === maxDayVal && count > 0;
              return (
                <div key={dIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                  <div
                    title={`${dayNames[dIdx]}: ${count} messages`}
                    style={{
                      width: '100%',
                      height: `${Math.max(dPct, 8)}%`,
                      background: isPeak ? 'linear-gradient(to top, #833AB4, #F77737)' : palette.cardInnerBg,
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.2s ease'
                    }}
                  />
                  <span style={{ fontSize: '9.5px', color: isPeak ? palette.textPrimary : palette.textSecondary, fontWeight: isPeak ? 700 : 400 }}>
                    {dayNames[dIdx]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Row 4: Top Emojis & Word Cloud & Media Sharing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        
        {/* Top Emojis */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>😍</span> Top Emojis Exchanged
          </div>

          {topEmojisCombined.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {topEmojisCombined.map(([emoji, count], eIdx) => (
                <div
                  key={eIdx}
                  style={{
                    background: palette.cardInnerBg,
                    border: `1px solid ${palette.border}`,
                    borderRadius: '12px',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{emoji}</span>
                  <span style={{ fontSize: '11px', color: palette.textSecondary, fontWeight: 700 }}>x{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: palette.textSecondary }}>No emojis detected.</div>
          )}
        </div>

        {/* Media & Reels Shared */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎬</span> Shared Media & Reels
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: palette.cardInnerBg, padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ color: palette.textSecondary }}>Reels Shared</span>
              <span style={{ color: palette.textPrimary, fontWeight: 700 }}>{reelsMe} ({meName}) vs {reelsPartner} ({partnerName})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: palette.cardInnerBg, padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ color: palette.textSecondary }}>Photos Sent</span>
              <span style={{ color: palette.textPrimary, fontWeight: 700 }}>{photosMe} vs {photosPartner}</span>
            </div>
          </div>
        </div>

        {/* Top Keywords / Words */}
        <div
          style={{
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔤</span> Top Keywords
          </div>

          {topKeywords.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {topKeywords.slice(0, 8).map(([word, count], wIdx) => (
                <span
                  key={wIdx}
                  style={{
                    background: wIdx === 0 ? 'linear-gradient(135deg, rgba(225, 48, 108, 0.2), rgba(131, 58, 180, 0.2))' : palette.cardInnerBg,
                    border: wIdx === 0 ? '1px solid #E1306C' : `1px solid ${palette.border}`,
                    color: wIdx === 0 ? '#E1306C' : palette.textPrimary,
                    fontSize: '11.5px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '16px'
                  }}
                >
                  {word} <span style={{ opacity: 0.6, fontSize: '10px' }}>({count})</span>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: palette.textSecondary }}>No text keywords.</div>
          )}
        </div>

      </div>

    </div>
  );
}

export default function InstagramChatModal({
  isOpen = true,
  onClose,
  threads = [],
  initialThreadKey = null,
  zipFileRef = null,
  onUploadDMs,
  isInline = false
}) {
  const [selectedThreadKey, setSelectedThreadKey] = useState(null);
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'media' | 'reels' | 'audio'
  const [mediaUrls, setMediaUrls] = useState({});
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mySenderName, setMySenderName] = useState(null); // User-selected "Me" identity
  const [expandedEditsMap, setExpandedEditsMap] = useState({}); // Track expanded edit history per msg
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const [highlightedDateStr, setHighlightedDateStr] = useState(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('peeksta_theme') || 'dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('peeksta_theme', next);
  };

  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#0B0B0E' : '#F4F5F7',
    chatBg: isDark ? '#000000' : '#FFFFFF',
    sidebarBg: isDark ? '#0D0D0D' : '#FAFAFA',
    headerBg: isDark ? '#141414' : '#FFFFFF',
    cardBg: isDark ? '#141414' : '#FFFFFF',
    cardInnerBg: isDark ? '#1F1F1F' : '#E5E7EB',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#8E8E8E' : '#6B7280',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    incomingBubbleBg: isDark ? '#262626' : '#E5E7EB',
    incomingBubbleText: isDark ? '#F5F5F5' : '#111827'
  };

  const handleJumpToMessage = (msgId, dateStr = null) => {
    setFilterType('all');
    setChatSearchQuery('');
    setShowInChatSearch(false);
    if (msgId) setHighlightedMsgId(msgId);
    if (dateStr) setHighlightedDateStr(dateStr);

    setTimeout(() => {
      let el = null;
      if (msgId) el = document.getElementById(`msg-item-${msgId}`);
      if (!el && dateStr) el = document.getElementById(`date-header-${dateStr}`);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (dateStr) {
        // Fallback search by text matching
        const allDateElements = document.querySelectorAll('[id^="date-header-"]');
        for (const dateEl of allDateElements) {
          if (dateEl.textContent.includes(dateStr) || dateStr.includes(dateEl.textContent)) {
            dateEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      }
    }, 150);

    setTimeout(() => {
      setHighlightedMsgId(null);
      setHighlightedDateStr(null);
    }, 3500);
  };

  const audioRefs = useRef({});
  const chatMessagesEndRef = useRef(null);

  // Synchronize selected thread key when modal opens or initialThreadKey changes
  useEffect(() => {
    if (initialThreadKey && threads.some(t => t.threadKey === initialThreadKey)) {
      setSelectedThreadKey(initialThreadKey);
    } else if (threads.length > 0) {
      setSelectedThreadKey(threads[0].threadKey);
    }
  }, [isOpen, initialThreadKey, threads]);

  const activeThread = threads.find(t => t.threadKey === selectedThreadKey) || threads[0] || null;

  // Auto-detect available senders in active thread
  const activeSenders = activeThread ? Array.from(new Set(activeThread.messages.map(m => m.sender).filter(Boolean))) : [];

  // Collect available Month/Year dates for quick jumping dropdown
  const availableMonthYears = useMemo(() => {
    if (!activeThread || !activeThread.messages) return [];
    const set = new Set();
    activeThread.messages.forEach(m => {
      if (m.timestamp > 0) {
        const d = new Date(m.timestamp);
        const monthYear = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        set.add(monthYear);
      }
    });
    return Array.from(set);
  }, [activeThread]);

  // Reset or auto-determine "My Sender Name" when thread changes
  useEffect(() => {
    if (!activeThread) return;
    const title = (activeThread.title || '').toLowerCase().trim();
    // Find sender that does NOT match the thread title (that is ME!)
    const nonTitleSender = activeSenders.find(s => {
      const lower = s.toLowerCase().trim();
      return lower !== title && !title.includes(lower);
    });

    if (nonTitleSender) {
      setMySenderName(nonTitleSender);
    } else if (activeSenders.length > 1) {
      setMySenderName(activeSenders[1]); // fallback second participant
    } else if (activeSenders.length > 0) {
      setMySenderName(activeSenders[0]);
    }
  }, [selectedThreadKey]);

  // Process uploaded zip or json DM files
  const processDMFile = async (filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    setIsUploading(true);

    try {
      const extractedDMs = [];
      let lastZip = null;

      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = new JSZip();
          const loadedZip = await zip.loadAsync(file);
          lastZip = loadedZip;
          const paths = Object.keys(loadedZip.files).filter(
            (p) => !loadedZip.files[p].dir && p.toLowerCase().endsWith('.json')
          );

          for (const relativePath of paths) {
            const lower = relativePath.toLowerCase();
            if (lower.includes('inbox') || lower.includes('message')) {
              try {
                const content = await loadedZip.files[relativePath].async('string');
                const thread = parseMessageThread(content, relativePath);
                if (thread && thread.messageCount > 0) {
                  extractedDMs.push(thread);
                }
              } catch (e) {}
            }
          }
        } else if (file.name.toLowerCase().endsWith('.json')) {
          const text = await file.text();
          const thread = parseMessageThread(text, file.name);
          if (thread && thread.messageCount > 0) {
            extractedDMs.push(thread);
          }
        }
      }

      if (extractedDMs.length > 0 && onUploadDMs) {
        onUploadDMs(extractedDMs, lastZip);
      } else {
        alert("No DM message threads found in the uploaded file(s). Make sure you upload your Instagram Messages export zip containing messages/inbox or message JSON files.");
      }
    } catch (err) {
      console.error(err);
      alert("Error reading DM file archive.");
    } finally {
      setIsUploading(false);
    }
  };

  // Auto-scroll chat to bottom when active thread or filter changes
  useEffect(() => {
    if (activeThread && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThreadKey, filterType]);

  // Load media blob URLs from zip file on-demand
  const getMediaUrl = async (uri) => {
    if (!uri) return null;
    if (mediaUrls[uri]) return mediaUrls[uri];
    if (!zipFileRef || !zipFileRef.files) return null;

    const normUri = uri.replace(/\\/g, '/');
    let matchingKey = Object.keys(zipFileRef.files).find(
      k => k.replace(/\\/g, '/').endsWith(normUri) || normUri.endsWith(k.replace(/\\/g, '/'))
    );

    if (!matchingKey) {
      const basename = normUri.split('/').pop();
      matchingKey = Object.keys(zipFileRef.files).find(k => k.endsWith(basename));
    }

    if (matchingKey) {
      try {
        const fileObj = zipFileRef.files[matchingKey];
        const blob = await fileObj.async('blob');
        const url = URL.createObjectURL(blob);
        setMediaUrls(prev => ({ ...prev, [uri]: url }));
        return url;
      } catch (err) {
        console.error('Failed to load media blob:', err);
      }
    }
    return null;
  };

  // Pre-load media for active thread messages
  useEffect(() => {
    if (!activeThread || !zipFileRef) return;
    const messages = activeThread.messages || [];

    messages.forEach(msg => {
      (msg.photos || []).forEach(p => { if (p.uri && !mediaUrls[p.uri]) getMediaUrl(p.uri); });
      (msg.videos || []).forEach(v => { if (v.uri && !mediaUrls[v.uri]) getMediaUrl(v.uri); });
      (msg.audioFiles || []).forEach(a => { if (a.uri && !mediaUrls[a.uri]) getMediaUrl(a.uri); });
    });
  }, [activeThread, zipFileRef]);

  if (!isOpen && !isInline) return null;

  // Render Dedicated DM Messages Dropzone if no threads are loaded yet
  if (threads.length === 0) {
    const dropzoneContent = (
      <div
        style={{
          position: isInline ? 'relative' : 'fixed',
          top: 0,
          left: 0,
          width: isInline ? '100%' : '100vw',
          height: isInline ? 'auto' : '100vh',
          minHeight: '100vh',
          background: '#0B0B0E',
          color: '#F5F5F5',
          zIndex: isInline ? 1 : 2500,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          overflowY: 'auto'
        }}
      >
        {/* Top Navbar */}
        <header
          style={{
            height: '64px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(11, 11, 14, 0.8)',
            backdropFilter: 'blur(16px)',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#E0E0E0',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>← Back to App</span>
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #E1306C 0%, #833AB4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF'
                }}
              >
                <IconMessage size={16} />
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFF' }}>Instagram DM Studio</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              color: '#4ADE80',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }}></span>
            100% On-Device & Private
          </div>
        </header>

        {/* Hero & Upload Center */}
        <main
          style={{
            flex: 1,
            maxHeight: 'calc(100vh - 64px)',
            maxWidth: '900px',
            width: '100%',
            margin: '0 auto',
            padding: '36px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          {/* Ambient Glow */}
          <div
            style={{
              position: 'relative',
              marginBottom: '20px'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(225, 48, 108, 0.35) 0%, rgba(131, 58, 180, 0.15) 60%, transparent 70%)',
                filter: 'blur(20px)',
                pointerEvents: 'none'
              }}
            />
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, #E1306C 0%, #C13584 50%, #833AB4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                position: 'relative',
                boxShadow: '0 12px 32px rgba(225, 48, 108, 0.4)'
              }}
            >
              <IconUpload size={34} />
            </div>
          </div>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#FFF',
              letterSpacing: '-0.5px',
              marginBottom: '10px'
            }}
          >
            Upload Instagram <span style={{ background: 'linear-gradient(135deg, #F9CE34 0%, #E1306C 50%, #833AB4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DM Export</span>
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: '#9E9EA0',
              maxWidth: '560px',
              lineHeight: '1.6',
              marginBottom: '28px'
            }}
          >
            Drag and drop your Instagram <code>messages.zip</code> archive or <code>message_1.json</code> files below to explore full chat histories, voice notes, photos, and unredacted edit logs.
          </p>

          {/* Interactive Dropzone */}
          <div
            className={`bento-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer?.files?.length) {
                processDMFile(e.dataTransfer.files);
              }
            }}
            onClick={() => document.getElementById('insta-dm-modal-file-input')?.click()}
            style={{
              width: '100%',
              maxWidth: '680px',
              padding: '42px 32px',
              borderRadius: '24px',
              border: isDragging ? '2px dashed #E1306C' : '1.5px dashed rgba(255, 255, 255, 0.16)',
              background: isDragging
                ? 'rgba(225, 48, 108, 0.12)'
                : 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
              marginBottom: '32px',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isDragging ? '0 0 40px rgba(225, 48, 108, 0.25)' : '0 16px 48px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 28px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #E1306C 0%, #FD1D1D 50%, #F56040 100%)',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '14px',
                marginBottom: '12px',
                boxShadow: '0 8px 24px rgba(225, 48, 108, 0.35)',
                transition: 'transform 0.15s ease'
              }}
            >
              {isUploading ? 'Parsing Archive...' : 'Select ZIP or JSON File'}
            </div>

            <div style={{ fontSize: '13px', color: '#A0A0A5', fontWeight: 500 }}>
              or drop files directly into this studio
            </div>

            <div style={{ fontSize: '11px', color: '#6E6E73', marginTop: '10px' }}>
              Supports Instagram <code>messages.zip</code> archives & <code>message_1.json</code> files
            </div>

            <input
              id="insta-dm-modal-file-input"
              type="file"
              accept=".zip,.json"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => processDMFile(e.target.files)}
            />
          </div>

          {/* Quick Guide Steps Cards */}
          <div
            style={{
              width: '100%',
              maxWidth: '780px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              textAlign: 'left'
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '18px 18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ background: 'rgba(225, 48, 108, 0.15)', color: '#E1306C', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>1</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#F0F0F0' }}>Instagram Settings</span>
              </div>
              <p style={{ fontSize: '12px', color: '#8E8E93', margin: 0, lineHeight: '1.4' }}>
                Go to <strong>Settings & Privacy &gt; Account Center &gt; Download your information</strong>
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '18px 18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ background: 'rgba(225, 48, 108, 0.15)', color: '#E1306C', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>2</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#F0F0F0' }}>Choose JSON Format</span>
              </div>
              <p style={{ fontSize: '12px', color: '#8E8E93', margin: 0, lineHeight: '1.4' }}>
                Select <strong>Messages</strong> only, set format to <strong>JSON</strong>, and request download.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '18px 18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ background: 'rgba(225, 48, 108, 0.15)', color: '#E1306C', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>3</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#F0F0F0' }}>Drop Archive Here</span>
              </div>
              <p style={{ fontSize: '12px', color: '#8E8E93', margin: 0, lineHeight: '1.4' }}>
                Drop the downloaded <code>messages.zip</code> or extracted <code>json</code> file to view.
              </p>
            </div>
          </div>
        </main>
      </div>
    );

    return dropzoneContent;
  }

  // Filter threads sidebar by search query
  const filteredThreads = threads.filter(t => {
    const q = threadSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const titleMatch = (t.title || '').toLowerCase().includes(q);
    const partMatch = (t.participants || []).some(p => p.toLowerCase().includes(q));
    const msgMatch = (t.messages || []).some(m => m.content.toLowerCase().includes(q));
    return titleMatch || partMatch || msgMatch;
  });

  // Filter messages for active thread
  let messagesToDisplay = activeThread ? (activeThread.messages || []) : [];

  if (filterType === 'media') {
    messagesToDisplay = messagesToDisplay.filter(
      m => (m.photos && m.photos.length > 0) || (m.videos && m.videos.length > 0)
    );
  } else if (filterType === 'reels') {
    messagesToDisplay = messagesToDisplay.filter(m => isReelMessage(m));
  } else if (filterType === 'audio') {
    messagesToDisplay = messagesToDisplay.filter(m => m.audioFiles && m.audioFiles.length > 0);
  }

  if (chatSearchQuery.trim()) {
    const cq = chatSearchQuery.toLowerCase().trim();
    messagesToDisplay = messagesToDisplay.filter(
      m => m.content.toLowerCase().includes(cq) || m.sender.toLowerCase().includes(cq)
    );
  }

  // Audio Playback handler
  const handleToggleAudio = (msgId, audioUri) => {
    const currentAudio = audioRefs.current[msgId];
    if (!currentAudio) return;

    if (playingAudioId === msgId) {
      currentAudio.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioRefs.current[playingAudioId]) {
        audioRefs.current[playingAudioId].pause();
      }
      currentAudio.play();
      setPlayingAudioId(msgId);
    }
  };

  // Helper to determine if a message is a System Event / Reaction notification
  const isSystemEvent = (content) => {
    if (!content || typeof content !== 'string') return false;
    const lower = content.trim();
    return (
      /^Reacted .* to /i.test(lower) ||
      /^Liked a message/i.test(lower) ||
      /^Liked a photo/i.test(lower) ||
      /^Liked a video/i.test(lower) ||
      /^Sent an attachment/i.test(lower)
    );
  };

  // Group messages by Date headers
  const groupedMessages = [];
  let currentDate = null;

  messagesToDisplay.forEach((msg) => {
    const dateStr = msg.formattedDate || 'Date Unknown';
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groupedMessages.push({ type: 'date', date: dateStr, key: `date_${dateStr}` });
    }
    groupedMessages.push({ type: 'message', msg, key: msg.id });
  });

  const mainChatWorkspace = (
    <div
      className="insta-chat-modal-workspace"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
        background: colors.bg,
        color: colors.textPrimary,
        border: 'none',
        boxShadow: 'none',
        zIndex: 2500
      }}
    >
      {/* Instagram DM Container Layout */}
      <div style={{ display: 'flex', flex: 1, height: '100%', minHeight: 0 }}>
        
        {/* LEFT SIDEBAR: Conversations List */}
        <div
          className="insta-chat-sidebar"
          style={{
            width: '340px',
            flexShrink: 0,
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            background: colors.sidebarBg
          }}
        >
          {/* Sidebar Header */}
          {/* Hidden File Input for uploading new DMs anytime */}
          <input
            id="insta-dm-modal-sidebar-file-input"
            type="file"
            accept=".zip,.json"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => processDMFile(e.target.files)}
          />

          {/* Sidebar Top Header Bar */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: colors.headerBg
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E1306C 0%, #833AB4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF'
                }}
              >
                <IconMessage size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: colors.textPrimary, margin: 0, letterSpacing: '-0.2px' }}>
                  Direct Messages
                </h3>
                <span style={{ fontSize: '11px', color: colors.textSecondary }}>
                  {threads.length} conversations
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => document.getElementById('insta-dm-modal-sidebar-file-input')?.click()}
                style={{
                  background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                  border: 'none',
                  color: '#FFF',
                  padding: '5px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(225, 48, 108, 0.35)',
                  whiteSpace: 'nowrap'
                }}
                title="Upload additional DMs from another account or ZIP file"
              >
                <IconUpload size={12} /> + Add Export
              </button>

              <button
                onClick={toggleTheme}
                style={{
                  background: isDark ? '#262626' : '#E5E7EB',
                  border: `1px solid ${colors.border}`,
                  color: isDark ? '#F5F5F5' : '#111827',
                  padding: '5px 9px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Toggle Dark or Light Mode"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>

          {/* Thread Search Box */}
          <div style={{ padding: '12px 14px 8px 14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: colors.cardInnerBg,
                borderRadius: '12px',
                padding: '8px 12px',
                border: `1px solid ${colors.border}`
              }}
            >
              <IconSearch size={14} style={{ color: colors.textSecondary }} />
              <input
                type="text"
                placeholder="Search chats..."
                value={threadSearchQuery}
                onChange={(e) => setThreadSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: colors.textPrimary,
                  fontSize: '12.5px',
                  width: '100%'
                }}
              />
              {threadSearchQuery && (
                <button
                  onClick={() => setThreadSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', padding: 0 }}
                >
                  <IconClose size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Thread List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => {
                const isSelected = thread.threadKey === selectedThreadKey;
                // Find last non-system text message snippet
                const validMsgs = (thread.messages || []).filter(m => !isSystemEvent(m.content));
                const latestMsg = validMsgs.length > 0 ? validMsgs[validMsgs.length - 1] : (thread.messages?.[thread.messages.length - 1] || null);

                return (
                  <div
                    key={thread.threadKey}
                    onClick={() => setSelectedThreadKey(thread.threadKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      transition: 'all 0.15s ease',
                      background: isSelected ? (isDark ? 'rgba(225, 48, 108, 0.16)' : '#FFF0F5') : 'transparent',
                      border: isSelected ? (isDark ? '1px solid rgba(225, 48, 108, 0.35)' : '1px solid #FFD1DC') : '1px solid transparent'
                    }}
                  >
                    {/* Avatar with live profile photo & IG gradient outline */}
                    <UserAvatar username={thread.title} title={thread.title} size={42} isDark={isDark} />

                    {/* Info */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '2px'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: isSelected ? (isDark ? '#FFF' : '#E1306C') : colors.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {thread.title}
                        </div>
                        <span style={{ fontSize: '10px', color: colors.textSecondary, flexShrink: 0 }}>
                          {thread.latestDate || ''}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '11.5px',
                          color: colors.textSecondary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {latestMsg ? (latestMsg.content || (latestMsg.photos?.length ? '📷 Photo' : latestMsg.audioFiles?.length ? '🎵 Voice message' : 'Media attachment')) : 'No messages'}
                      </div>

                      {/* Badges */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                            color: colors.textSecondary,
                            padding: '1px 6px',
                            borderRadius: '8px'
                          }}
                        >
                          {thread.messageCount} msgs
                        </span>
                        {thread.photosCount > 0 && (
                          <span style={{ fontSize: '10px', color: '#E1306C', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <IconImage size={10} /> {thread.photosCount}
                          </span>
                        )}
                        {thread.audioCount > 0 && (
                          <span style={{ fontSize: '10px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <IconMusic size={10} /> {thread.audioCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: colors.textSecondary, fontSize: '12px' }}>
                No matching conversations found
              </div>
            )}
          </div>
        </div>

        {/* RIGHT MAIN CHAT AREA */}
        <div
          className="insta-chat-main"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: colors.chatBg,
            minWidth: 0,
            position: 'relative'
          }}
        >
          {activeThread ? (
            <>
              {/* Chat Header Row 1: Profile Info & Right Actions */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: colors.headerBg,
                  gap: '16px'
                }}
              >
                {/* Left: User Avatar & Names */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <UserAvatar username={activeThread.title} title={activeThread.title} size={40} isDark={isDark} />
                  <div style={{ minWidth: 0 }}>
                    <h4
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: colors.textPrimary,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {activeThread.title}
                    </h4>
                    <div
                      style={{
                        fontSize: '11px',
                        color: colors.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {activeThread.participants.join(', ') || 'Direct Conversation'}
                    </div>
                  </div>
                </div>

                {/* Right Actions: "I am", Search, Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {activeSenders.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: colors.cardInnerBg,
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '11.5px'
                      }}
                    >
                      <span style={{ color: colors.textSecondary }}>I am:</span>
                      <select
                        value={mySenderName || ''}
                        onChange={(e) => setMySenderName(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#E1306C',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {activeSenders.map(s => (
                          <option key={s} value={s} style={{ background: colors.cardBg, color: colors.textPrimary }}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {availableMonthYears.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleJumpToMessage(null, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      style={{
                        background: colors.cardInnerBg,
                        border: `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                        padding: '6px 10px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    >
                      <option value="">📅 Jump to Month...</option>
                      {availableMonthYears.map((mStr, idx) => (
                        <option key={idx} value={mStr} style={{ background: colors.cardBg, color: colors.textPrimary }}>
                          {mStr}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => setShowInChatSearch(!showInChatSearch)}
                    style={{
                      background: showInChatSearch ? 'rgba(225, 48, 108, 0.25)' : colors.cardInnerBg,
                      border: `1px solid ${colors.border}`,
                      color: showInChatSearch ? '#E1306C' : colors.textPrimary,
                      padding: '6px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600
                    }}
                    title="Search inside conversation"
                  >
                    <IconSearch size={14} />
                    Search
                  </button>

                  {onClose && (
                    <button
                      onClick={onClose}
                      style={{
                        background: colors.cardInnerBg,
                        border: 'none',
                        color: colors.textSecondary,
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
                  )}
                </div>
              </div>

              {/* Chat Header Row 2: Filter Pills Track */}
              <div
                style={{
                  padding: '8px 20px',
                  background: colors.headerBg,
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    background: colors.cardInnerBg,
                    borderRadius: '10px',
                    padding: '2px',
                    gap: '2px',
                    width: 'max-content'
                  }}
                >
                  <button
                    onClick={() => setFilterType('all')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: filterType === 'all' ? 'linear-gradient(135deg, #E1306C, #833AB4)' : 'transparent',
                      color: filterType === 'all' ? '#FFF' : colors.textSecondary
                    }}
                  >
                    All ({activeThread.messageCount})
                  </button>
                  <button
                    onClick={() => setFilterType('media')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: filterType === 'media' ? 'linear-gradient(135deg, #E1306C, #833AB4)' : 'transparent',
                      color: filterType === 'media' ? '#FFF' : colors.textSecondary
                    }}
                  >
                    <IconImage size={11} /> Media ({(activeThread.photosCount || 0) + (activeThread.videosCount || 0)})
                  </button>
                  <button
                    onClick={() => setFilterType('reels')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: filterType === 'reels' ? 'linear-gradient(135deg, #E1306C, #833AB4)' : 'transparent',
                      color: filterType === 'reels' ? '#FFF' : colors.textSecondary
                    }}
                  >
                    <IconVideo size={11} /> Reels ({activeThread.reelsCount || 0})
                  </button>
                  <button
                    onClick={() => setFilterType('audio')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: filterType === 'audio' ? 'linear-gradient(135deg, #E1306C, #833AB4)' : 'transparent',
                      color: filterType === 'audio' ? '#FFF' : colors.textSecondary
                    }}
                  >
                    <IconMusic size={11} /> Audio ({activeThread.audioCount || 0})
                  </button>
                  <button
                    onClick={() => setFilterType('analytics')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: filterType === 'analytics' ? 'linear-gradient(135deg, #E1306C, #833AB4)' : 'transparent',
                      color: filterType === 'analytics' ? '#FFF' : colors.textSecondary
                    }}
                  >
                    <IconZap size={11} /> Analytics 📊
                  </button>
                </div>

                <button
                  onClick={() => setShowRecapModal(true)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                    color: '#FFF',
                    boxShadow: '0 2px 8px rgba(225, 48, 108, 0.4)',
                    whiteSpace: 'nowrap',
                    marginLeft: 'auto'
                  }}
                  title="Generate shareable Story Recap card"
                >
                  ✨ Story Recap
                </button>
              </div>

              {/* In-Chat Keyword Search Bar Overlay */}
              {showInChatSearch && (
                <div
                  style={{
                    padding: '10px 20px',
                    background: colors.headerBg,
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <IconSearch size={15} style={{ color: '#E1306C' }} />
                  <input
                    type="text"
                    placeholder="Type keywords to search within this chat..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      background: colors.cardInnerBg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '10px',
                      padding: '8px 14px',
                      color: colors.textPrimary,
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  {chatSearchQuery && (
                    <span style={{ fontSize: '11.5px', color: '#E1306C', fontWeight: 600 }}>
                      {messagesToDisplay.length} matching messages
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setChatSearchQuery('');
                      setShowInChatSearch(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* MESSAGES TIMELINE CANVAS */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: colors.chatBg
                }}
              >
                {filterType === 'analytics' ? (
                  <ThreadAnalyticsView
                    analytics={computeThreadAnalytics(activeThread, mySenderName)}
                    thread={activeThread}
                    onOpenRecap={() => setShowRecapModal(true)}
                    onJumpToMessage={handleJumpToMessage}
                    colors={colors}
                    isDark={isDark}
                  />
                ) : groupedMessages.length > 0 ? (
                  groupedMessages.map((item) => {
                    if (item.type === 'date') {
                      return (
                        <div
                          key={item.key}
                          id={`date-header-${item.date}`}
                          style={{
                            textAlign: 'center',
                            margin: '16px 0 8px 0'
                          }}
                        >
                          <span
                            style={{
                              background: colors.cardInnerBg,
                              color: colors.textSecondary,
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '4px 14px',
                              borderRadius: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: `1px solid ${colors.border}`
                            }}
                          >
                            {item.date}
                          </span>
                        </div>
                      );
                    }

                    const msg = item.msg;
                    const sysEvent = isSystemEvent(msg.content);

                    // Render Centered System Event Badges (e.g. "Abhijeet reacted 😲 to your message")
                    if (sysEvent) {
                      return (
                        <div
                          key={item.key}
                          style={{
                            textAlign: 'center',
                            margin: '4px 0',
                            fontSize: '11px',
                            color: colors.textSecondary
                          }}
                        >
                          <span
                            style={{
                              background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                              border: `1px solid ${colors.border}`,
                              padding: '3px 10px',
                              borderRadius: '10px',
                              display: 'inline-block'
                            }}
                          >
                            <strong>{msg.sender}</strong> {msg.content}
                          </span>
                        </div>
                      );
                    }

                    // ACCURATE SENDER ALIGNMENT LOGIC:
                    // If mySenderName is selected, sender === mySenderName -> OUTGOING (Right side)
                    // Else: sender !== thread title -> OUTGOING (Right side)
                    const titleClean = (activeThread.title || '').toLowerCase().trim();
                    const senderClean = (msg.sender || '').toLowerCase().trim();

                    const isOwner = mySenderName
                      ? senderClean === mySenderName.toLowerCase().trim()
                      : (senderClean !== titleClean && !titleClean.includes(senderClean));

                    const hasPhotos = msg.photos && msg.photos.length > 0;
                    const hasVideos = msg.videos && msg.videos.length > 0;
                    const hasAudio = msg.audioFiles && msg.audioFiles.length > 0;

                    const isEditedMsg = Boolean(
                      msg.isEdited ||
                      (msg.edits && msg.edits.length > 0) ||
                      (msg.content && (
                        msg.content.toLowerCase().includes('meta summaris') ||
                        msg.content.toLowerCase().includes('meta summarise')
                      ))
                    );

                    const editDraftsList = (msg.edits && msg.edits.length > 0)
                      ? msg.edits
                      : ['Meta summaris'];

                    // Default to expanded (true) so edit history is visible matching Instagram Web UI
                    const isExpandedEdit = expandedEditsMap[msg.id] !== undefined
                      ? Boolean(expandedEditsMap[msg.id])
                      : true;

                    let mainContentText = msg.content || '';
                    if (mainContentText.trim().toLowerCase() === 'meta summaris') {
                      mainContentText = 'Meta summarise';
                    }

                    const isHighlighted = highlightedMsgId === msg.id;

                    return (
                      <div
                        key={item.key}
                        id={`msg-item-${msg.id}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isOwner ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                          alignSelf: isOwner ? 'flex-end' : 'flex-start',
                          position: 'relative',
                          margin: '2px 0',
                          padding: isHighlighted ? '8px 12px' : '0',
                          borderRadius: isHighlighted ? '16px' : '0',
                          background: isHighlighted ? 'rgba(225, 48, 108, 0.18)' : 'transparent',
                          boxShadow: isHighlighted ? '0 0 20px rgba(225, 48, 108, 0.5)' : 'none',
                          border: isHighlighted ? '1.5px solid #E1306C' : 'none',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {/* Sender Name label above received bubbles */}
                        {!isOwner && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              color: colors.textSecondary,
                              marginBottom: '3px',
                              marginLeft: '36px',
                              fontWeight: 600
                            }}
                          >
                            {msg.sender}
                          </span>
                        )}

                        {/* Flex Row containing Received User Avatar + Message Bubble */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%', justifyContent: isOwner ? 'flex-end' : 'flex-start' }}>
                          {!isOwner && (
                            <UserAvatar username={msg.sender} title={msg.sender} size={28} style={{ marginBottom: '4px' }} isDark={isDark} />
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwner ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                            
                            {/* "Show edits" / "Hide edits" Toggle Link Button */}
                            {isEditedMsg && (
                              <div style={{ marginBottom: '4px', alignSelf: isOwner ? 'flex-end' : 'flex-start' }}>
                                <button
                                  onClick={() => setExpandedEditsMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                  style={{
                                    background: colors.cardInnerBg,
                                    border: `1px solid ${colors.border}`,
                                    color: '#3B82F6', // Blue link style matching user screenshot
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Click to toggle edit history"
                                >
                                  {isExpandedEdit ? 'Hide edits' : 'Show edits'}
                                </button>
                              </div>
                            )}

                            {/* Previous Edit Drafts (Rendered when "Hide edits" / expanded) */}
                            {isEditedMsg && isExpandedEdit && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px', width: '100%', alignItems: isOwner ? 'flex-end' : 'flex-start' }}>
                                {editDraftsList.map((draftText, dIdx) => (
                                  <div
                                    key={dIdx}
                                    style={{
                                      padding: '8px 14px',
                                      borderRadius: isOwner ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                      background: colors.cardInnerBg,
                                      color: colors.textSecondary, // Faded previous draft text matching user screenshot
                                      fontSize: '13px',
                                      lineHeight: '1.4',
                                      border: `1px solid ${colors.border}`,
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                      maxWidth: '100%'
                                    }}
                                  >
                                    <span style={{ fontSize: '9px', color: colors.textSecondary, display: 'block', marginBottom: '2px', fontWeight: 600 }}>
                                      Previous draft {dIdx + 1}:
                                    </span>
                                    {draftText}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Main Message Bubble Container */}
                            <div
                              style={{
                                padding: msg.content || msg.share ? '10px 16px' : '6px',
                                borderRadius: isOwner ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                background: isOwner
                                  ? 'linear-gradient(135deg, #E1306C 0%, #833AB4 100%)'
                                  : colors.incomingBubbleBg,
                                color: isOwner ? '#FFFFFF' : colors.incomingBubbleText,
                                fontSize: '13.5px',
                                lineHeight: '1.45',
                                wordBreak: 'break-word',
                                boxShadow: isOwner
                                  ? '0 4px 14px rgba(225, 48, 108, 0.3)'
                                  : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                border: isOwner ? 'none' : `1px solid ${colors.border}`
                              }}
                            >
                              {/* Text Content */}
                              {mainContentText && (
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                  {chatSearchQuery ? (
                                    <HighlightSearchText text={mainContentText} query={chatSearchQuery} />
                                  ) : (
                                    mainContentText
                                  )}
                                </div>
                              )}

                              {/* Shared Link / Reel Preview Card */}
                              {msg.share && (
                                <div
                                  style={{
                                    marginTop: msg.content ? '8px' : 0,
                                    padding: '10px 12px',
                                    background: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.05)',
                                    borderRadius: '14px',
                                    fontSize: '12px',
                                    border: `1px solid ${colors.border}`,
                                    maxWidth: '320px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E1306C', fontWeight: 700, marginBottom: '4px' }}>
                                    <IconVideo size={14} />
                                    <span>Instagram Shared Reel / Post</span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11.5px',
                                      color: colors.textPrimary,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      marginBottom: '6px'
                                    }}
                                  >
                                    {msg.share.shareText || msg.share.link}
                                  </div>
                                  {msg.share.link && (
                                    <a
                                      href={msg.share.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        fontSize: '11px',
                                        color: isOwner ? '#FFF' : '#E1306C',
                                        textDecoration: 'underline',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      View on Instagram
                                      <IconArrowUpRight size={10} />
                                    </a>
                                  )}
                                </div>
                              )}

                          {/* Photo Attachments */}
                          {hasPhotos && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: msg.content ? '8px' : 0 }}>
                              {msg.photos.map((photo, pIdx) => {
                                const blobUrl = mediaUrls[photo.uri];
                                return (
                                  <div
                                    key={pIdx}
                                    onClick={() => setPreviewImage(blobUrl || photo.uri)}
                                    style={{
                                      position: 'relative',
                                      borderRadius: '12px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      maxWidth: '240px',
                                      maxHeight: '240px',
                                      background: colors.cardInnerBg,
                                      border: `1px solid ${colors.border}`
                                    }}
                                  >
                                    {blobUrl ? (
                                      <img
                                        src={blobUrl}
                                        alt="Photo attachment"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          padding: '16px 20px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          gap: '6px',
                                          color: colors.textSecondary,
                                          fontSize: '11px'
                                        }}
                                      >
                                        <IconImage size={24} style={{ color: '#E1306C' }} />
                                        <span>📷 Photo Attachment</span>
                                        <span style={{ fontSize: '9px', opacity: 0.7 }}>{photo.uri?.split('/').pop()}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Video Attachments */}
                          {hasVideos && (
                            <div style={{ marginTop: msg.content ? '8px' : 0 }}>
                              {msg.videos.map((vid, vIdx) => {
                                const blobUrl = mediaUrls[vid.uri];
                                return (
                                  <div key={vIdx} style={{ borderRadius: '12px', overflow: 'hidden', maxWidth: '280px' }}>
                                    {blobUrl ? (
                                      <video src={blobUrl} controls style={{ width: '100%', borderRadius: '12px' }} />
                                    ) : (
                                      <div
                                        style={{
                                          padding: '14px',
                                          background: colors.cardInnerBg,
                                          borderRadius: '10px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          fontSize: '11.5px',
                                          color: colors.textPrimary
                                        }}
                                      >
                                        <IconVideo size={18} style={{ color: '#E1306C' }} />
                                        <span>🎥 Video Attachment ({vid.uri?.split('/').pop()})</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Audio Voice Notes */}
                          {hasAudio && (
                            <div style={{ marginTop: msg.content ? '8px' : 0 }}>
                              {msg.audioFiles.map((aud, aIdx) => {
                                const blobUrl = mediaUrls[aud.uri];
                                const isPlaying = playingAudioId === `${msg.id}_${aIdx}`;

                                return (
                                  <div
                                    key={aIdx}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      padding: '8px 12px',
                                      background: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.05)',
                                      borderRadius: '14px',
                                      border: `1px solid ${colors.border}`,
                                      minWidth: '220px'
                                    }}
                                  >
                                    <button
                                      onClick={() => handleToggleAudio(`${msg.id}_${aIdx}`, blobUrl)}
                                      disabled={!blobUrl}
                                      style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '50%',
                                        background: isPlaying ? '#E1306C' : 'linear-gradient(135deg, #E1306C, #833AB4)',
                                        border: 'none',
                                        color: '#FFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: blobUrl ? 'pointer' : 'not-allowed',
                                        flexShrink: 0
                                      }}
                                    >
                                      {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
                                    </button>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px' }}>
                                        {[40, 70, 30, 90, 50, 80, 45, 95, 60, 30, 75, 40, 85].map((h, barIdx) => (
                                          <div
                                            key={barIdx}
                                            style={{
                                              flex: 1,
                                              height: `${h}%`,
                                              background: isPlaying ? '#E1306C' : (isDark ? '#A8A8A8' : '#9CA3AF'),
                                              borderRadius: '2px',
                                              transition: 'all 0.2s ease'
                                            }}
                                          />
                                        ))}
                                      </div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          fontSize: '10px',
                                          color: colors.textSecondary
                                        }}
                                      >
                                        <span>🎵 Voice Note</span>
                                        <span>{blobUrl ? 'Ready to play' : 'Audio file'}</span>
                                      </div>
                                    </div>

                                    {blobUrl && (
                                      <audio
                                        ref={(el) => (audioRefs.current[`${msg.id}_${aIdx}`] = el)}
                                        src={blobUrl}
                                        onEnded={() => setPlayingAudioId(null)}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {msg.reactions && msg.reactions.length > 0 && (
                          <div
                            style={{
                              marginTop: '-6px',
                              marginRight: isOwner ? '10px' : '0px',
                              marginLeft: !isOwner ? '10px' : '0px',
                              background: colors.cardInnerBg,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '12px',
                              padding: '2px 7px',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              zIndex: 2
                            }}
                            title={msg.reactions.map(r => `${r.actor}: ${r.reaction}`).join('\n')}
                          >
                            {msg.reactions.map((r, rIdx) => (
                              <span key={rIdx}>{r.reaction}</span>
                            ))}
                          </div>
                        )}

                        <span
                          style={{
                            fontSize: '9.5px',
                            color: colors.textSecondary,
                            marginTop: '3px',
                            padding: '0 4px'
                          }}
                        >
                          {msg.formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textSecondary }}>
                    <IconMessage size={32} style={{ marginBottom: '12px', color: colors.textSecondary }} />
                    <p style={{ fontSize: '13px' }}>No messages found matching your search filter.</p>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Footer Status Bar */}
              <div
                style={{
                  padding: '10px 20px',
                  background: colors.headerBg,
                  borderTop: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: colors.textSecondary
                }}
              >
                <span>
                  Thread: <strong>{activeThread.title}</strong> • {activeThread.messageCount} total messages
                </span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {activeThread.photosCount > 0 && <span>📷 {activeThread.photosCount} photos</span>}
                  {activeThread.videosCount > 0 && <span>🎥 {activeThread.videosCount} videos</span>}
                  {activeThread.audioCount > 0 && <span>🎵 {activeThread.audioCount} voice notes</span>}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E8E8E' }}>
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        {mainChatWorkspace}
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)',
              zIndex: 1200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px'
            }}
          >
            <img
              src={previewImage}
              alt="Enlarged photo preview"
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '16px', objectFit: 'contain' }}
            />
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#262626',
                border: 'none',
                color: '#FFF',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <IconClose size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      {mainChatWorkspace}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px'
          }}
        >
          <img
            src={previewImage}
            alt="Enlarged photo preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '16px', objectFit: 'contain' }}
          />
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#262626',
              border: 'none',
              color: '#FFF',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconClose size={20} />
          </button>
        </div>
      )}

      {/* Chat Recap & Story Card Generator Modal */}
      <ChatRecapModal
        isOpen={showRecapModal}
        onClose={() => setShowRecapModal(false)}
        activeThread={activeThread}
        analytics={computeThreadAnalytics(activeThread, mySenderName)}
      />
    </div>
  );
}

// Highlight keyword helper component
function HighlightSearchText({ text, query }) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: '#F9CE34',
              color: '#000',
              padding: '0 2px',
              borderRadius: '3px',
              fontWeight: 700
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
