import { useState } from 'react';
import {
  IconMessage,
  IconHeart,
  IconVolumeX,
  IconClose,
  IconArrowUpRight,
  IconStar,
  IconUsers
} from './icons';

export default function EngagementHubModal({
  isOpen,
  onClose,
  dmThreads = [],
  likedAccounts = [],
  mutuals = [],
  whitelist,
  toggleWhitelist
}) {
  const [activeTab, setActiveTab] = useState('dms'); // 'dms' | 'liked' | 'silent'

  if (!isOpen) return null;

  // Compute silent mutuals: Mutual friends who do not appear in any top DM conversations
  const dmParticipantsSet = new Set();
  dmThreads.forEach(t => {
    (t.participants || []).forEach(p => dmParticipantsSet.add(p.toLowerCase().trim()));
    if (t.title) dmParticipantsSet.add(t.title.toLowerCase().trim());
  });

  const silentMutuals = mutuals.filter(m => {
    const handle = (typeof m === 'string' ? m : m.username || '').toLowerCase();
    const name = (typeof m === 'string' ? '' : m.name || '').toLowerCase();
    return !dmParticipantsSet.has(handle) && (!name || !dmParticipantsSet.has(name));
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-bubble" style={{ background: 'var(--bento-accent-soft)', color: 'var(--bento-accent)' }}>
              <IconMessage size={16} />
            </div>
            <div>
              <h3 className="modal-title">Engagement & DM Interaction Studio</h3>
              <div className="modal-subtitle">Analyze chat conversations, top liked creators, and silent mutual friends</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconClose size={14} />
          </button>
        </div>

        {/* Bento Segmented Tabs */}
        <div className="explorer-top-tabs" style={{ marginBottom: '14px' }}>
          <button
            className={`bento-tab-pill ${activeTab === 'dms' ? 'active' : ''}`}
            onClick={() => setActiveTab('dms')}
          >
            <IconMessage size={12} />
            Top DMs ({dmThreads.length})
          </button>
          <button
            className={`bento-tab-pill ${activeTab === 'liked' ? 'active' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            <IconHeart size={12} />
            Most Liked ({likedAccounts.length})
          </button>
          <button
            className={`bento-tab-pill ${activeTab === 'silent' ? 'active' : ''}`}
            onClick={() => setActiveTab('silent')}
          >
            <IconVolumeX size={12} />
            Silent Mutuals ({silentMutuals.length})
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {activeTab === 'dms' && (
            <div>
              {dmThreads.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dmThreads.map((thread, idx) => (
                    <div key={`${thread.threadKey}-${idx}`} className="bento-user-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--bento-radius-sm)',
                            background: 'var(--bento-card-subtle)',
                            color: 'var(--bento-accent)',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          #{idx + 1}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--bento-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {thread.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--bento-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {thread.participants.join(', ') || 'Direct Conversation'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className="nav-counter-pill alert-green" style={{ fontSize: '11px', padding: '3px 8px' }}>
                          {thread.messageCount.toLocaleString()} msgs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-data-state">
                  <div style={{ color: 'var(--bento-text-light)', marginBottom: '8px' }}>
                    <IconMessage size={24} />
                  </div>
                  <h3>No DM threads found in this upload</h3>
                  <p>
                    When exporting your Instagram data, check the <strong>Messages</strong> category to reveal your conversation leaderboards.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'liked' && (
            <div>
              {likedAccounts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {likedAccounts.slice(0, 50).map((item, idx) => (
                    <div key={`${item.username}-${idx}`} className="bento-user-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--bento-radius-sm)',
                            background: 'var(--bento-rose-soft)',
                            color: 'var(--bento-rose)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <IconHeart size={14} filled={true} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <a
                            href={`https://www.instagram.com/${item.username}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="bento-user-name"
                            style={{ display: 'block' }}
                          >
                            @{item.username}
                          </a>
                          <div style={{ fontSize: '11px', color: 'var(--bento-text-muted)' }}>
                            {item.count} posts liked by you
                          </div>
                        </div>
                      </div>

                      <a
                        href={`https://www.instagram.com/${item.username}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="bento-btn bento-btn-secondary bento-btn-sm"
                      >
                        Profile
                        <IconArrowUpRight size={10} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-data-state">
                  <div style={{ color: 'var(--bento-text-light)', marginBottom: '8px' }}>
                    <IconHeart size={24} />
                  </div>
                  <h3>No liked posts records found</h3>
                  <p>
                    Include the <strong>Likes</strong> file (<code>liked_posts.json</code>) in your export to see your most appreciated accounts.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'silent' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bento-text-muted)', marginBottom: '12px' }}>
                Mutual connections who follow each other but have zero recorded DM interactions.
              </div>

              {silentMutuals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {silentMutuals.map((user, idx) => {
                    const username = typeof user === 'string' ? user : user.username;
                    const name = typeof user === 'string' ? '' : user.name;
                    const isVip = whitelist.has(username.toLowerCase());
                    return (
                      <div key={`${username}-${idx}`} className="bento-user-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--bento-radius-sm)',
                              background: 'var(--bento-card-subtle)',
                              color: 'var(--bento-accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <IconUsers size={14} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="bento-user-name">{name || username}</div>
                            <a
                              href={`https://www.instagram.com/${username}/`}
                              target="_blank"
                              rel="noreferrer"
                              className="bento-user-handle"
                            >
                              @{username}
                            </a>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className={`bento-star-btn ${isVip ? 'active' : ''}`}
                            onClick={() => toggleWhitelist(username)}
                            title={isVip ? 'Remove VIP' : 'Star as VIP'}
                          >
                            <IconStar size={13} filled={isVip} />
                          </button>
                          <a
                            href={`https://www.instagram.com/${username}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="bento-btn bento-btn-secondary bento-btn-sm"
                          >
                            DM
                            <IconArrowUpRight size={10} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-data-state">
                  <div style={{ color: 'var(--bento-text-light)', marginBottom: '8px' }}>
                    <IconVolumeX size={24} />
                  </div>
                  <h3>No silent mutuals</h3>
                  <p>All your mutual connections appear to have active message interactions!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
