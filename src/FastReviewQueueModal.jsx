import { useState, useEffect } from 'react';
import {
  IconZap,
  IconClose,
  IconArrowUpRight,
  IconStar,
  IconChevronLeft,
  IconChevronRight,
  IconCheckCircle
} from './icons';

export default function FastReviewQueueModal({
  isOpen,
  onClose,
  accounts = [],
  whitelist,
  toggleWhitelist,
  showToast
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedSet, setReviewedSet] = useState(new Set());

  // Reset index when accounts change or opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation listener
  useEffect(() => {
    if (!isOpen || !accounts.length) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const currentAcc = accounts[currentIndex];
      const username = typeof currentAcc === 'string' ? currentAcc : currentAcc?.username;

      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(accounts.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === ' ' || e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (username) {
          window.open(`https://www.instagram.com/${username}/`, '_blank');
        }
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (username) {
          toggleWhitelist(username);
        }
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        if (username) {
          setReviewedSet((prev) => {
            const next = new Set(prev);
            if (next.has(username)) next.delete(username);
            else next.add(username);
            return next;
          });
          setCurrentIndex((i) => Math.min(accounts.length - 1, i + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, accounts, currentIndex, toggleWhitelist]);

  if (!isOpen) return null;

  const currentAccount = accounts[currentIndex];
  const username = typeof currentAccount === 'string' ? currentAccount : currentAccount?.username || '';
  const name = typeof currentAccount === 'string' ? '' : currentAccount?.name || '';
  const isVip = whitelist.has(username.toLowerCase());
  const isReviewed = reviewedSet.has(username);

  const progressPercent = accounts.length > 0 ? Math.round((reviewedSet.size / accounts.length) * 100) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-bubble" style={{ background: 'var(--bento-accent-soft)', color: 'var(--bento-accent)' }}>
              <IconZap size={16} />
            </div>
            <div>
              <h3 className="modal-title">Fast Review & Unfollow Queue</h3>
              <div className="modal-subtitle">Keyboard-driven triage for non-followers</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconClose size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          {/* Progress bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600, color: 'var(--bento-text-muted)', marginBottom: '6px' }}>
              <span>Progress: {reviewedSet.size} of {accounts.length} reviewed</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bento-card-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--bento-accent)', borderRadius: '999px', transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
            </div>
          </div>

          {currentAccount ? (
            <div style={{ padding: '24px 20px', background: 'var(--bento-card-bg)', borderRadius: 'var(--bento-radius-lg)', border: '1px solid var(--bento-border)', marginBottom: '16px' }}>
              {/* Avatar */}
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '20px',
                  margin: '0 auto 14px auto',
                  background: 'var(--bento-card-subtle)',
                  color: 'var(--bento-accent)',
                  fontSize: '24px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--bento-border)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={`/api/avatar?username=${encodeURIComponent(username)}`}
                  alt={name || username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>

              {/* Names */}
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--bento-text-main)' }}>
                {name || username}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--bento-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                @{username}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                {isVip && (
                  <span className="nav-counter-pill alert-amber" style={{ fontSize: '11px', padding: '4px 10px' }}>
                    <IconStar size={11} filled={true} />
                    Protected VIP
                  </span>
                )}
                {isReviewed && (
                  <span className="nav-counter-pill alert-green" style={{ fontSize: '11px', padding: '4px 10px' }}>
                    <IconCheckCircle size={11} />
                    Marked as Reviewed
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                <a
                  href={`https://www.instagram.com/${username}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="bento-btn bento-btn-primary bento-btn-sm"
                  style={{ padding: '8px 16px' }}
                >
                  Open on Instagram
                  <IconArrowUpRight size={11} />
                </a>

                <button
                  type="button"
                  className="bento-btn bento-btn-secondary bento-btn-sm"
                  onClick={() => toggleWhitelist(username)}
                >
                  <IconStar size={12} filled={isVip} />
                  {isVip ? 'Starred as VIP (S)' : 'Star VIP (S)'}
                </button>

                <button
                  type="button"
                  className="bento-btn bento-btn-secondary bento-btn-sm"
                  onClick={() => {
                    setReviewedSet((prev) => {
                      const next = new Set(prev);
                      if (next.has(username)) next.delete(username);
                      else next.add(username);
                      return next;
                    });
                  }}
                >
                  <IconCheckCircle size={12} />
                  {isReviewed ? 'Undo Review (U)' : 'Mark Reviewed (U)'}
                </button>
              </div>

              {/* Navigation Arrows */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', borderTop: '1px solid var(--bento-border)', paddingTop: '14px' }}>
                <button
                  className="bento-btn bento-btn-secondary bento-btn-sm"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                >
                  <IconChevronLeft size={12} />
                  Previous (K)
                </button>

                <span style={{ fontSize: '12px', color: 'var(--bento-text-muted)', fontWeight: 600 }}>
                  {currentIndex + 1} of {accounts.length}
                </span>

                <button
                  className="bento-btn bento-btn-secondary bento-btn-sm"
                  disabled={currentIndex >= accounts.length - 1}
                  onClick={() => setCurrentIndex((i) => Math.min(accounts.length - 1, i + 1))}
                >
                  Next (J)
                  <IconChevronRight size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-data-state">
              <h3>No accounts in queue</h3>
            </div>
          )}

          {/* Keyboard shortcut legend */}
          <div style={{ fontSize: '11px', color: 'var(--bento-text-muted)', background: 'var(--bento-card-subtle)', padding: '10px 14px', borderRadius: 'var(--bento-radius-md)', border: '1px solid var(--bento-border)' }}>
            <strong style={{ color: 'var(--bento-text-main)' }}>Shortcuts:</strong> <code>J</code> / <code>→</code> (Next) • <code>K</code> / <code>←</code> (Prev) • <code>Space</code> (Open Instagram) • <code>S</code> (Star VIP) • <code>U</code> (Mark Reviewed)
          </div>
        </div>
      </div>
    </div>
  );
}
