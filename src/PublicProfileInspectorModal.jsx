import { useState } from 'react';
import { UserAvatar } from './InstagramChatModal';
import {
  IconClose,
  IconSearch,
  IconArrowUpRight,
  IconMessage,
  IconUserCheck,
  IconUsers,
  IconStar,
  IconShield,
  IconVideo,
  IconImage
} from './icons';

function getCleanHandle(nameStr) {
  if (!nameStr) return '';
  const s = String(nameStr).trim();
  const match = s.match(/@?([a-zA-Z0-9_.]+)/);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return s.toLowerCase().replace(/[\s(),]+/g, '');
}

export default function PublicProfileInspectorModal({
  isOpen = false,
  onClose,
  initialUsername = '',
  threads = [],
  followingList = [],
  followersList = [],
  closeFriendsList = [],
  blockedList = [],
  onSelectThread,
  isDark = true
}) {
  const [searchHandle, setSearchHandle] = useState(initialUsername || '');
  const [activeHandle, setActiveHandle] = useState(initialUsername || 'artivap_');

  if (!isOpen) return null;

  const palette = {
    modalBg: isDark ? '#141414' : '#FFFFFF',
    cardInnerBg: isDark ? '#1F1F1F' : '#F3F4F6',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#8E8E8E' : '#6B7280',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    overlayBg: 'rgba(0, 0, 0, 0.75)'
  };

  const currentHandle = getCleanHandle(activeHandle || searchHandle) || 'instagram';

  // Cross reference in local state
  const matchedThread = threads.find((t) => {
    if (!t) return false;
    const titleClean = getCleanHandle(t.title);
    const keyClean = getCleanHandle(t.threadKey);
    return titleClean === currentHandle || keyClean === currentHandle;
  });

  const isFollowing = followingList.some((u) => getCleanHandle(typeof u === 'string' ? u : u.value || u.name) === currentHandle);
  const isFollower = followersList.some((u) => getCleanHandle(typeof u === 'string' ? u : u.value || u.name) === currentHandle);
  const isCloseFriend = closeFriendsList.some((u) => getCleanHandle(typeof u === 'string' ? u : u.value || u.name) === currentHandle);
  const isBlocked = blockedList.some((u) => getCleanHandle(typeof u === 'string' ? u : u.value || u.name) === currentHandle);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchHandle.trim()) {
      setActiveHandle(searchHandle.trim());
    }
  };

  const igProfileUrl = `https://www.instagram.com/${currentHandle}/`;
  const igReelsUrl = `https://www.instagram.com/${currentHandle}/reels/`;
  const igStoriesUrl = `https://www.instagram.com/stories/${currentHandle}/`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: palette.overlayBg,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: palette.modalBg,
          border: `1px solid ${palette.border}`,
          borderRadius: '24px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: `1px solid ${palette.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.12), rgba(131, 58, 180, 0.12))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔍</span>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: palette.textPrimary, margin: 0 }}>
              Instagram Profile Inspector
            </h3>
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
            <IconClose size={16} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Username Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
            <div
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <IconSearch size={16} style={{ position: 'absolute', left: '14px', color: '#E1306C' }} />
              <input
                type="text"
                placeholder="Enter Instagram username (e.g. artivap_ or @username)..."
                value={searchHandle}
                onChange={(e) => setSearchHandle(e.target.value)}
                style={{
                  width: '100%',
                  background: palette.cardInnerBg,
                  border: `1px solid ${palette.border}`,
                  borderRadius: '14px',
                  padding: '12px 14px 12px 42px',
                  color: palette.textPrimary,
                  fontSize: '13.5px',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                border: 'none',
                color: '#FFF',
                borderRadius: '14px',
                padding: '0 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(225, 48, 108, 0.4)'
              }}
            >
              Inspect
            </button>
          </form>

          {/* Profile Card Summary Box */}
          <div
            style={{
              background: palette.cardInnerBg,
              border: `1px solid ${palette.border}`,
              borderRadius: '20px',
              padding: '24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top Instagram Gradient Glow */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #F58529, #DD2A7B, #833AB4, #515BD4)'
              }}
            />

            {/* Avatar Preview */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div
                style={{
                  padding: '3px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E1306C, #833AB4)'
                }}
              >
                <UserAvatar username={currentHandle} title={currentHandle} size={84} isDark={isDark} />
              </div>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: palette.textPrimary, margin: '0 0 2px 0' }}>
              @{currentHandle}
            </h2>
            <p style={{ fontSize: '12px', color: palette.textSecondary, margin: '0 0 16px 0' }}>
              Instagram Public Profile & Activity Inspector
            </p>

            {/* Relationship Status Badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {isFollowing && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconUserCheck size={12} /> You Follow
                </span>
              )}
              {isFollower && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#3B82F6', background: 'rgba(59, 130, 246, 0.15)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconUsers size={12} /> Follows You
                </span>
              )}
              {isCloseFriend && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.15)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconStar size={12} /> Close Friend
                </span>
              )}
              {isBlocked && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconShield size={12} /> Blocked
                </span>
              )}
              {!isFollowing && !isFollower && !isCloseFriend && !isBlocked && (
                <span style={{ fontSize: '11px', color: palette.textSecondary, background: palette.modalBg, padding: '4px 10px', borderRadius: '12px', border: `1px solid ${palette.border}` }}>
                  Public Account Inspector
                </span>
              )}
            </div>

            {/* Direct Instagram Links */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <a
                href={igProfileUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                  color: '#FFF',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(225, 48, 108, 0.35)'
                }}
              >
                <span>Open Profile</span>
                <IconArrowUpRight size={14} />
              </a>

              <a
                href={igReelsUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: palette.modalBg,
                  border: `1px solid ${palette.border}`,
                  color: palette.textPrimary,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <IconVideo size={14} style={{ color: '#E1306C' }} />
                <span>Posts & Reels</span>
              </a>

              <a
                href={igStoriesUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: palette.modalBg,
                  border: `1px solid ${palette.border}`,
                  color: palette.textPrimary,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <IconImage size={14} style={{ color: '#F59E0B' }} />
                <span>Story Link</span>
              </a>
            </div>

          </div>

          {/* Uploaded DM Thread Cross-Reference Card */}
          {matchedThread ? (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.1) 0%, rgba(131, 58, 180, 0.1) 100%)',
                border: '1px solid rgba(225, 48, 108, 0.3)',
                borderRadius: '16px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconMessage size={16} style={{ color: '#E1306C' }} />
                  <span>Found Chat History in Uploaded DMs</span>
                </div>
                <div style={{ fontSize: '12px', color: palette.textSecondary }}>
                  <strong>{matchedThread.messageCount}</strong> messages exchanged • Last active {matchedThread.latestDate || 'Recently'}
                </div>
              </div>

              {onSelectThread && (
                <button
                  onClick={() => {
                    onSelectThread(matchedThread.threadKey);
                    onClose();
                  }}
                  style={{
                    background: '#E1306C',
                    border: 'none',
                    color: '#FFF',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(225, 48, 108, 0.4)'
                  }}
                >
                  Open Chat →
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                background: palette.cardInnerBg,
                border: `1px solid ${palette.border}`,
                borderRadius: '16px',
                padding: '16px 20px',
                fontSize: '12px',
                color: palette.textSecondary,
                textAlign: 'center'
              }}
            >
              💬 No DM history found for <strong>@{currentHandle}</strong> in uploaded archives. Use "Open Profile" button above to view public profile on Instagram.
            </div>
          )}

          {/* Privacy Note */}
          <div style={{ fontSize: '11px', color: palette.textSecondary, lineHeight: '1.4', textAlign: 'center', opacity: 0.8 }}>
            🔒 <strong>Privacy Note:</strong> Profile previews and links inspect publicly available handles. Instagram server-side privacy policies enforce authorization controls for private accounts.
          </div>

        </div>
      </div>
    </div>
  );
}
