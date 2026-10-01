import { useState, useEffect, useMemo } from 'react';
import {
  getSnapshots,
  deleteSnapshot,
  compareSnapshots,
  saveSnapshot
} from './snapshotStorage';
import {
  IconClock,
  IconClose,
  IconScale,
  IconZap,
  IconCamera,
  IconUserMinus,
  IconUsers,
  IconStar,
  IconArrowUpRight,
  IconDownload,
  IconTrash,
  IconChevronRight
} from './icons';

export default function TimeMachineModal({
  isOpen,
  onClose,
  currentInsights,
  whitelist,
  toggleWhitelist,
  onLoadSnapshotIntoStudio,
  showToast
}) {
  const [snapshots, setSnapshots] = useState([]);
  const [activeTab, setActiveTab] = useState('compare'); // 'compare' | 'history'
  const [snapshotAId, setSnapshotAId] = useState('');
  const [snapshotBId, setSnapshotBId] = useState('current');
  const [diffCategory, setDiffCategory] = useState('lost'); // 'lost' | 'gained' | 'unfollowed' | 'new'
  const [customLabel, setCustomLabel] = useState('');

  const refreshSnapshots = async () => {
    try {
      const list = await getSnapshots();
      setSnapshots(list);
      if (list.length >= 2 && !snapshotAId) {
        setSnapshotAId(list[1].id);
        setSnapshotBId(list[0].id);
      } else if (list.length === 1 && !snapshotAId) {
        setSnapshotAId(list[0].id);
        setSnapshotBId('current');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshSnapshots();
    }
  }, [isOpen]);

  const handleSaveCurrent = async () => {
    if (!currentInsights.followers.length && !currentInsights.following.length) {
      showToast('No followers or following loaded to snapshot.');
      return;
    }
    const defaultLabel = customLabel.trim() || `Export - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    try {
      await saveSnapshot({
        label: defaultLabel,
        followers: currentInsights.followers,
        following: currentInsights.following,
      });
      setCustomLabel('');
      showToast('Snapshot saved to Time-Machine!');
      await refreshSnapshots();
    } catch (e) {
      showToast('Error saving snapshot.');
    }
  };

  const handleDelete = async (id, label) => {
    if (confirm(`Delete snapshot "${label}"?`)) {
      await deleteSnapshot(id);
      showToast('Snapshot deleted.');
      await refreshSnapshots();
      if (snapshotAId === id) setSnapshotAId('');
      if (snapshotBId === id) setSnapshotBId('current');
    }
  };

  const handleExportJsonBackup = () => {
    if (!snapshots.length) return;
    const blob = new Blob([JSON.stringify(snapshots, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instalens_snapshots_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Exported snapshots backup JSON!');
  };

  // Compute Diff between Selected Snapshots
  const diff = useMemo(() => {
    if (!snapshotAId) return null;

    const snapA = snapshots.find(s => s.id === snapshotAId);
    if (!snapA) return null;

    let snapB = null;
    if (snapshotBId === 'current') {
      snapB = {
        id: 'current',
        label: 'Current Session (Active Upload)',
        createdAt: new Date().toISOString(),
        followersCount: currentInsights.followers.length,
        followingCount: currentInsights.following.length,
        followers: currentInsights.followers,
        following: currentInsights.following
      };
    } else {
      snapB = snapshots.find(s => s.id === snapshotBId);
    }

    if (!snapB) return null;

    return compareSnapshots(snapA, snapB);
  }, [snapshotAId, snapshotBId, snapshots, currentInsights]);

  if (!isOpen) return null;

  const currentDiffItems = diff
    ? diffCategory === 'lost'
      ? diff.lostFollowers
      : diffCategory === 'gained'
      ? diff.gainedFollowers
      : diffCategory === 'unfollowed'
      ? diff.unfollowedByYou
      : diff.newFollowing
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-bubble" style={{ background: 'var(--bento-accent-soft)', color: 'var(--bento-accent)' }}>
              <IconClock size={16} />
            </div>
            <div>
              <h3 className="modal-title">Time-Machine & Historical Diff</h3>
              <div className="modal-subtitle">Compare archive snapshots to trace exact unfollowers over time</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconClose size={14} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="explorer-top-tabs" style={{ marginBottom: '16px' }}>
          <button
            className={`bento-tab-pill ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <IconScale size={12} />
            Compare Snapshots
          </button>
          <button
            className={`bento-tab-pill ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <IconClock size={12} />
            Snapshot Vault ({snapshots.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {activeTab === 'compare' && (
            <div>
              {/* Controls */}
              <div className="compare-controls-card" style={{ background: 'var(--bento-card-bg)', border: '1px solid var(--bento-border)', borderRadius: 'var(--bento-radius-lg)', padding: '16px' }}>
                <div className="compare-pickers-row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Picker A */}
                  <div className="compare-picker-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--bento-text-muted)', marginBottom: '4px', display: 'block' }}>
                      Base Snapshot (Earlier Date):
                    </label>
                    <select
                      className="compare-select"
                      style={{ width: '100%', height: '36px', fontSize: '12px' }}
                      value={snapshotAId}
                      onChange={(e) => setSnapshotAId(e.target.value)}
                    >
                      <option value="">-- Choose Base Snapshot --</option>
                      {snapshots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} ({new Date(s.createdAt).toLocaleDateString()} — {s.followersCount} followers)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ color: 'var(--bento-text-muted)', display: 'flex', alignItems: 'center', paddingTop: '16px' }}>
                    <IconChevronRight size={16} />
                  </div>

                  {/* Picker B */}
                  <div className="compare-picker-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--bento-text-muted)', marginBottom: '4px', display: 'block' }}>
                      Target Snapshot (Later Date):
                    </label>
                    <select
                      className="compare-select"
                      style={{ width: '100%', height: '36px', fontSize: '12px' }}
                      value={snapshotBId}
                      onChange={(e) => setSnapshotBId(e.target.value)}
                    >
                      <option value="current">
                        Current Session ({currentInsights.followers.length} followers, {currentInsights.following.length} following)
                      </option>
                      {snapshots
                        .filter((s) => s.id !== snapshotAId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label} ({new Date(s.createdAt).toLocaleDateString()} — {s.followersCount} followers)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Quick Save Bar */}
                {currentInsights.followers.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--bento-border)' }}>
                    <input
                      type="text"
                      className="compare-select"
                      style={{ flex: 1, height: '34px', fontSize: '12px' }}
                      placeholder="Name this snapshot (e.g. October 2026 Archive)..."
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                    />
                    <button className="bento-btn bento-btn-primary bento-btn-sm" onClick={handleSaveCurrent}>
                      <IconCamera size={13} />
                      Save Snapshot
                    </button>
                  </div>
                )}
              </div>

              {/* Comparison Diff Breakdown */}
              {diff ? (
                <div style={{ marginTop: '16px' }}>
                  <div className="diff-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {/* Lost Followers */}
                    <div
                      className={`diff-stat-card ${diffCategory === 'lost' ? 'active' : ''}`}
                      onClick={() => setDiffCategory('lost')}
                      style={{ cursor: 'pointer', padding: '12px', borderRadius: 'var(--bento-radius-md)', background: diffCategory === 'lost' ? 'var(--bento-card-subtle)' : 'var(--bento-card-bg)', border: `1px solid ${diffCategory === 'lost' ? 'var(--bento-rose)' : 'var(--bento-border)'}` }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bento-rose)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconUserMinus size={13} />
                        Lost Followers
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bento-rose)', margin: '4px 0 2px 0' }}>
                        {diff.lostFollowers.length}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--bento-text-muted)' }}>
                        Unfollowed your account
                      </div>
                    </div>

                    {/* Gained Followers */}
                    <div
                      className={`diff-stat-card ${diffCategory === 'gained' ? 'active' : ''}`}
                      onClick={() => setDiffCategory('gained')}
                      style={{ cursor: 'pointer', padding: '12px', borderRadius: 'var(--bento-radius-md)', background: diffCategory === 'gained' ? 'var(--bento-card-subtle)' : 'var(--bento-card-bg)', border: `1px solid ${diffCategory === 'gained' ? 'var(--bento-accent)' : 'var(--bento-border)'}` }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bento-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconUsers size={13} />
                        Gained Followers
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bento-accent)', margin: '4px 0 2px 0' }}>
                        +{diff.gainedFollowers.length}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--bento-text-muted)' }}>
                        New audience gained
                      </div>
                    </div>

                    {/* Unfollowed By You */}
                    <div
                      className={`diff-stat-card ${diffCategory === 'unfollowed' ? 'active' : ''}`}
                      onClick={() => setDiffCategory('unfollowed')}
                      style={{ cursor: 'pointer', padding: '12px', borderRadius: 'var(--bento-radius-md)', background: diffCategory === 'unfollowed' ? 'var(--bento-card-subtle)' : 'var(--bento-card-bg)', border: `1px solid ${diffCategory === 'unfollowed' ? 'var(--bento-accent)' : 'var(--bento-border)'}` }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bento-text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconUserMinus size={13} />
                        Unfollowed By You
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bento-text-main)', margin: '4px 0 2px 0' }}>
                        {diff.unfollowedByYou.length}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--bento-text-muted)' }}>
                        Accounts you unfollowed
                      </div>
                    </div>

                    {/* New Following */}
                    <div
                      className={`diff-stat-card ${diffCategory === 'new' ? 'active' : ''}`}
                      onClick={() => setDiffCategory('new')}
                      style={{ cursor: 'pointer', padding: '12px', borderRadius: 'var(--bento-radius-md)', background: diffCategory === 'new' ? 'var(--bento-card-subtle)' : 'var(--bento-card-bg)', border: `1px solid ${diffCategory === 'new' ? 'var(--bento-accent)' : 'var(--bento-border)'}` }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bento-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconUsers size={13} />
                        New Following
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bento-accent)', margin: '4px 0 2px 0' }}>
                        +{diff.newFollowing.length}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--bento-text-muted)' }}>
                        Newly followed by you
                      </div>
                    </div>
                  </div>

                  {/* Active Diff Accounts Header */}
                  <div style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: 'var(--bento-text-main)' }}>
                    {diffCategory === 'lost' && `Accounts that unfollowed you (${diff.lostFollowers.length})`}
                    {diffCategory === 'gained' && `Accounts that followed you (${diff.gainedFollowers.length})`}
                    {diffCategory === 'unfollowed' && `Accounts you unfollowed (${diff.unfollowedByYou.length})`}
                    {diffCategory === 'new' && `Accounts you started following (${diff.newFollowing.length})`}
                  </div>

                  {currentDiffItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentDiffItems.map((u, idx) => {
                        const username = typeof u === 'string' ? u : u.username;
                        const name = typeof u === 'string' ? '' : u.name;
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
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                {(name || username || 'U').charAt(0).toUpperCase()}
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
                                Profile
                                <IconArrowUpRight size={10} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-data-state" style={{ padding: '24px 0' }}>
                      <div style={{ color: 'var(--bento-text-light)', marginBottom: '8px' }}>
                        <IconClock size={24} />
                      </div>
                      <h4>No accounts in this category</h4>
                      <p>No changes detected between the two snapshots for this metric.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-data-state" style={{ padding: '36px 0' }}>
                  <div style={{ color: 'var(--bento-text-light)', marginBottom: '8px' }}>
                    <IconClock size={24} />
                  </div>
                  <h3>Select two snapshots to compare</h3>
                  <p>
                    Choose an earlier snapshot from the left dropdown, and a later snapshot (or Current Session) on the right to see who unfollowed you.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--bento-text-muted)' }}>
                  All snapshots are stored locally and privately inside your browser.
                </div>
                {snapshots.length > 0 && (
                  <button className="bento-btn bento-btn-secondary bento-btn-sm" onClick={handleExportJsonBackup}>
                    <IconDownload size={12} />
                    Export Backup JSON
                  </button>
                )}
              </div>

              {snapshots.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="bento-user-row" style={{ padding: '12px 16px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--bento-text-main)' }}>{snap.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--bento-text-muted)', marginTop: '2px' }}>
                          Saved {new Date(snap.createdAt).toLocaleDateString()} • {snap.followersCount} followers • {snap.followingCount} following
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="bento-btn bento-btn-secondary bento-btn-sm"
                          onClick={() => {
                            setSnapshotAId(snap.id);
                            setSnapshotBId('current');
                            setActiveTab('compare');
                          }}
                        >
                          <IconScale size={11} />
                          Compare
                        </button>
                        {onLoadSnapshotIntoStudio && (
                          <button
                            className="bento-btn bento-btn-secondary bento-btn-sm"
                            onClick={() => {
                              onLoadSnapshotIntoStudio(snap);
                              onClose();
                            }}
                          >
                            Load
                          </button>
                        )}
                        <button
                          className="bento-btn bento-btn-secondary bento-btn-sm"
                          style={{ color: 'var(--bento-rose)' }}
                          onClick={() => handleDelete(snap.id, snap.label)}
                          title="Delete Snapshot"
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-data-state">
                  <div style={{ color: 'var(--bento-text-light)', marginBottom: '8px' }}>
                    <IconClock size={24} />
                  </div>
                  <h3>No saved snapshots yet</h3>
                  <p>When you upload an Instagram export, save a snapshot to track your follower changes over time.</p>
                  {currentInsights.followers.length > 0 && (
                    <button className="bento-btn bento-btn-primary bento-btn-sm" style={{ marginTop: '12px' }} onClick={handleSaveCurrent}>
                      <IconCamera size={12} />
                      Save Current Session as Snapshot #1
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
