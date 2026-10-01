import { useState, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import './App.css';
import TimeMachineModal from './TimeMachineModal';
import EngagementHubModal from './EngagementHubModal';
import SecurityScorecardModal from './SecurityScorecardModal';
import FastReviewQueueModal from './FastReviewQueueModal';
import { getWhitelist, saveWhitelist, saveSnapshot } from './snapshotStorage';
import { parseMessageThread, parseLikedPosts, computeSecurityHealth } from './analyticsParser';
import {
  IconDashboard,
  IconUserMinus,
  IconUsers,
  IconUserCheck,
  IconHeart,
  IconStar,
  IconMessage,
  IconClock,
  IconShield,
  IconSearch,
  IconUpload,
  IconZap,
  IconArrowUpRight,
  IconBell,
  IconCheckCircle,
  IconAlertTriangle,
  IconDownload,
  IconCopy,
  IconRefreshCw,
  IconClose,
  IconTrendingUp,
  IconTrendingDown
} from './icons';
import { SmoothWaveSparkline, DonutAllocationChart, ActivityBarChart } from './BentoCharts';

// Reserved Instagram URL segments that are not usernames
const IGNORED_ROUTES = new Set([
  'p', 'reel', 'reels', 'explore', 'stories', 'tv', 'direct',
  'accounts', 'developer', 'about', 'legal', 'help', 'privacy',
  'directory', 'terms', 'emails', 'graphql', 'api', 'static', 'tags'
]);

// Exact matchers for Core Lists
const isFollowersFile = (name) => /^followers?(_\d+)?$/i.test(name.trim());
const isFollowingFile = (name) => /^following(_\d+)?$/i.test(name.trim());

// Allowed files (filters out unrelated telemetry or media files)
const isValidArchiveFile = (baseName) => {
  const lower = baseName.toLowerCase().trim();
  if (isFollowersFile(lower) || isFollowingFile(lower)) return true;

  const allowedPatterns = [
    'close_friends',
    'blocked_profiles',
    'blocked_accounts',
    'hide_story_from',
    'pending_follow_requests',
    'recent_follow_requests',
    'recently_unfollowed_profiles',
    'restricted_profiles',
    'removed_suggestions',
    'following_hashtags',
    'synced_contacts',
    'personal_information',
    'profile_changes',
    'instagram_profile_information',
    'profile_information',
    'two_factor',
    'two_factor_authentication',
    'autofill_information',
    'autofill'
  ];

  return allowedPatterns.some((pattern) => lower.includes(pattern));
};

// Clean and validate username
const cleanUsername = (str) => {
  if (!str || typeof str !== 'string') return null;
  let val = str.trim().toLowerCase();
  if (val.startsWith('@')) val = val.substring(1);
  val = val.replace(/\/+$/, '');

  if (IGNORED_ROUTES.has(val)) return null;

  // Instagram username pattern
  if (/^[a-z0-9_.-]{1,30}$/.test(val)) {
    return val;
  }
  return null;
};

// Extract username handle from profile link (e.g. instagram.com/artivap_/ or instagram.com/_u/artivap_)
const extractUsernameFromUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    let normalized = urlStr.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    const url = new URL(normalized);
    if (!url.hostname.includes('instagram.com')) return null;
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (!pathParts.length) return null;

    if (pathParts[0] === 'explore' || pathParts[0] === 'tags') return null;

    let candidate = pathParts[0] === '_u' ? pathParts[1] : pathParts[0];
    return candidate ? cleanUsername(candidate) : null;
  } catch (e) {
    const m = urlStr.match(/instagram\.com\/(?:_u\/)?([a-zA-Z0-9_.-]+)/i);
    return m ? cleanUsername(m[1]) : null;
  }
};

// High-precision Instagram accounts parser (Extracts actual handles AND profile display names)
const parseInstagramAccounts = (dataStr) => {
  const accountsMap = new Map(); // username -> displayName
  if (!dataStr || typeof dataStr !== 'string') return [];

  const sanitizedStr = dataStr.replace(/^\uFEFF/, '').trim();

  try {
    const parsed = JSON.parse(sanitizedStr);

    const traverse = (node, inheritedTitle = '') => {
      if (!node) return;

      if (Array.isArray(node)) {
        for (const item of node) {
          if (typeof item === 'string') {
            const u = extractUsernameFromUrl(item) || cleanUsername(item);
            if (u && !accountsMap.has(u)) {
              accountsMap.set(u, inheritedTitle || u);
            }
          } else {
            traverse(item, inheritedTitle);
          }
        }
      } else if (typeof node === 'object') {
        const currentTitle = typeof node.title === 'string' && node.title.trim() ? node.title.trim() : (inheritedTitle || '');
        let handle = null;

        // 1. Core Priority: string_list_data (Where the real handle is in href or value)
        if (Array.isArray(node.string_list_data) && node.string_list_data.length > 0) {
          for (const s of node.string_list_data) {
            if (s) {
              if (s.href) {
                const u = extractUsernameFromUrl(s.href);
                if (u) { handle = u; break; }
              }
              if (!handle && typeof s.value === 'string' && s.value.trim()) {
                const u = cleanUsername(s.value);
                if (u) { handle = u; break; }
              }
            }
          }
        }

        // 2. label_values (Meta interactions format)
        if (!handle && Array.isArray(node.label_values)) {
          for (const lv of node.label_values) {
            if (lv && typeof lv.value === 'string' && lv.value.trim()) {
              const u = extractUsernameFromUrl(lv.value) || cleanUsername(lv.value);
              if (u) { handle = u; break; }
            }
          }
        }

        // 3. Explicit direct username keys
        if (!handle) {
          const directKeys = ['username', 'userName', 'user_name'];
          for (const k of directKeys) {
            if (typeof node[k] === 'string' && node[k].trim()) {
              const u = cleanUsername(node[k]);
              if (u) { handle = u; break; }
            }
          }
        }

        if (handle) {
          const displayName = currentTitle || handle;
          if (!accountsMap.has(handle) || accountsMap.get(handle) === handle) {
            accountsMap.set(handle, displayName);
          }
          return;
        }

        // Recurse into children
        for (const key of Object.keys(node)) {
          if (key !== 'string_list_data' && key !== 'label_values' && key !== 'media_list_data') {
            traverse(node[key], currentTitle);
          }
        }
      }
    };

    traverse(parsed);
  } catch (e) {
    console.warn("JSON parse fallback to regex");
  }

  // Regex fallback: only match valid instagram profile paths
  if (accountsMap.size === 0) {
    const linkRegex = /instagram\.com\/(?:_u\/)?([a-zA-Z0-9_.-]+)/gi;
    let match;
    while ((match = linkRegex.exec(sanitizedStr)) !== null) {
      const u = cleanUsername(match[1]);
      if (u && !accountsMap.has(u)) accountsMap.set(u, u);
    }
  }

  return Array.from(accountsMap.entries()).map(([username, name]) => ({ username, name }));
};

// Parser for following_hashtags.json
const parseHashtags = (dataStr) => {
  const tags = new Set();
  try {
    const parsed = JSON.parse(dataStr.replace(/^\uFEFF/, '').trim());
    const traverse = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const item of node) {
          if (typeof item === 'string') {
            tags.add(item.replace(/^#/, '').toLowerCase().trim());
          } else {
            traverse(item);
          }
        }
      } else if (typeof node === 'object') {
        if (Array.isArray(node.string_list_data)) {
          for (const s of node.string_list_data) {
            if (s?.value && typeof s.value === 'string' && s.value.trim()) {
              tags.add(s.value.replace(/^#/, '').toLowerCase().trim());
            } else if (s?.href && typeof s.href === 'string') {
              const m = s.href.match(/explore\/tags\/([^/?#]+)/i);
              if (m) tags.add(m[1].toLowerCase().trim());
            }
          }
        }
        if (typeof node.value === 'string' && node.value.trim() && !node.value.includes('/')) {
          tags.add(node.value.replace(/^#/, '').toLowerCase().trim());
        }
        for (const key of Object.keys(node)) {
          if (key !== 'string_list_data') traverse(node[key]);
        }
      }
    };
    traverse(parsed);
  } catch (e) {}
  return Array.from(tags);
};

// Parser for synced_contacts.json (Contact cards with Name and Phone/Email)
const parseSyncedContacts = (dataStr) => {
  const contacts = [];
  try {
    const parsed = typeof dataStr === 'string' ? JSON.parse(dataStr.replace(/^\uFEFF/, '').trim()) : dataStr;
    const traverse = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const item of node) {
          if (item && typeof item === 'object') {
            // First and Last Name
            const firstName = (item.first_name || '').trim();
            const lastName = (item.last_name || '').trim();
            let fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
            if (!fullName) {
              fullName = (item.name || item.contact_name || item.display_name || item.title || '').trim();
            }

            // Contact Info (phone, email, contact_point, string_list_data)
            let contactInfo = (
              item.contact_point ||
              item.contact_value ||
              item.phone_number ||
              item.phone ||
              item.email ||
              item.contact ||
              ''
            );

            if (typeof contactInfo === 'object') {
              contactInfo = contactInfo.value || contactInfo.phone_number || contactInfo.email || '';
            }

            if (!contactInfo && Array.isArray(item.string_list_data) && item.string_list_data[0]) {
              contactInfo = item.string_list_data[0].value || item.string_list_data[0].href || '';
            }

            if (!contactInfo && typeof item.value === 'string' && item.value !== fullName) {
              contactInfo = item.value;
            }

            if (fullName || contactInfo) {
              contacts.push({
                name: fullName || 'Unnamed Contact',
                contactInfo: String(contactInfo).trim() || 'No phone/email'
              });
            } else {
              traverse(item);
            }
          }
        }
      } else if (typeof node === 'object') {
        for (const k of Object.keys(node)) {
          traverse(node[k]);
        }
      }
    };
    traverse(parsed);
  } catch (e) {
    console.error("Failed to parse synced contacts:", e);
  }
  return contacts;
};

// Parser for structured account/system info (personal_information, profile_changes, two_factor, autofill)
const parseInfoRecords = (dataStr, fileCategory = '') => {
  const records = [];
  try {
    const parsed = typeof dataStr === 'string' ? JSON.parse(dataStr.replace(/^\uFEFF/, '').trim()) : dataStr;

    const extractItems = (node, parentLabel = '') => {
      if (!node) return;

      // 1. Meta's string_map_data format (used in personal_information, autofill, etc.)
      if (node.string_map_data && typeof node.string_map_data === 'object') {
        Object.entries(node.string_map_data).forEach(([key, valObj]) => {
          const val = valObj?.value || valObj?.href || (typeof valObj === 'string' ? valObj : '');
          if (val) {
            records.push({
              label: key,
              value: String(val),
              date: valObj?.timestamp ? new Date(valObj.timestamp * 1000).toLocaleDateString() : null
            });
          }
        });
        return;
      }

      // 2. Meta's string_list_data with title (used in profile_changes, two_factor, etc.)
      if (Array.isArray(node.string_list_data) && node.string_list_data.length > 0) {
        const title = (node.title || parentLabel || 'Entry').trim();
        for (const item of node.string_list_data) {
          const val = (item?.value || item?.href || '').trim();
          if (val) {
            records.push({
              label: title,
              value: val,
              date: item.timestamp ? new Date(item.timestamp * 1000).toLocaleDateString() : null
            });
          }
        }
        return;
      }

      if (Array.isArray(node)) {
        node.forEach(item => extractItems(item, parentLabel));
      } else if (typeof node === 'object') {
        Object.entries(node).forEach(([k, v]) => {
          if (k === 'string_map_data' || k === 'string_list_data' || k === 'media_list_data') return;
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            if (v !== '' && !k.toLowerCase().includes('hash') && k !== 'href') {
              const cleanKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              records.push({
                label: cleanKey,
                value: String(v),
                date: null
              });
            }
          } else {
            extractItems(v, k);
          }
        });
      }
    };

    extractItems(parsed);
  } catch (e) {
    console.error("Error parsing info records:", e);
  }
  return records;
};

// User Profile Avatar Component with graceful live image fetch and fallback
function UserAvatar({ username, name }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const initial = (name || username || 'U').trim().charAt(0).toUpperCase();

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [username]);

  return (
    <div className="bento-avatar-squircle" title={name && name !== username ? `${name} (@${username})` : `@${username}`}>
      {!imgError && username ? (
        <img
          key={username}
          src={`/api/avatar?username=${encodeURIComponent(username)}`}
          alt={name || username}
          className={`user-avatar-img ${imgLoaded ? 'loaded' : ''}`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      ) : null}
      <span className={`user-avatar-fallback ${imgLoaded ? 'hidden' : ''}`}>{initial}</span>
    </div>
  );
}

function App() {
  const [dataSets, setDataSets] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRawFile, setSelectedRawFile] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const [toastMessage, setToastMessage] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [diagUsername, setDiagUsername] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  const [showEngagementHub, setShowEngagementHub] = useState(false);
  const [showSecurityScorecard, setShowSecurityScorecard] = useState(false);
  const [showReviewQueue, setShowReviewQueue] = useState(false);
  const [dmThreads, setDmThreads] = useState([]);
  const [likedAccounts, setLikedAccounts] = useState([]);
  const [whitelist, setWhitelist] = useState(() => getWhitelist());
  const [filterOutWhitelisted, setFilterOutWhitelisted] = useState(false);

  // Onboarding modes
  const [uploadMode, setUploadMode] = useState('smart');
  const [slotFollowers, setSlotFollowers] = useState(null);
  const [slotFollowing, setSlotFollowing] = useState(null);
  const [pasteContent, setPasteContent] = useState('');
  const [pasteType, setPasteType] = useState('followers');

  const loadDemoData = () => {
    const demoFollowing = [
      { username: 'natgeo', name: 'National Geographic' },
      { username: 'nasa', name: 'NASA' },
      { username: 'cristiano', name: 'Cristiano Ronaldo' },
      { username: 'techcrunch', name: 'TechCrunch' },
      { username: 'wired', name: 'WIRED' },
      { username: 'designmilk', name: 'Design Milk' },
      { username: 'alexperez', name: 'Alex Perez' },
      { username: 'sarah_adams', name: 'Sarah Adams' },
      { username: 'david_kim', name: 'David Kim' },
      { username: 'emilyrose', name: 'Emily Rose' },
      { username: 'marcus_chen', name: 'Marcus Chen' },
      { username: 'laura_b', name: 'Laura Bailey' }
    ];
    const demoFollowers = [
      { username: 'alexperez', name: 'Alex Perez' },
      { username: 'sarah_adams', name: 'Sarah Adams' },
      { username: 'david_kim', name: 'David Kim' },
      { username: 'emilyrose', name: 'Emily Rose' },
      { username: 'john_doe_99', name: 'John Doe' },
      { username: 'sophia_w', name: 'Sophia Walker' },
      { username: 'mike_t', name: 'Mike Thompson' }
    ];
    setDataSets({
      followers_1: { name: 'followers_1', type: 'users', items: demoFollowers },
      following: { name: 'following', type: 'users', items: demoFollowing },
      following_hashtags: { name: 'following_hashtags', type: 'hashtags', items: ['webdesign', 'photography', 'travel', 'architecture', 'minimalism'] },
      synced_contacts: { name: 'synced_contacts', type: 'contacts', items: [{ name: 'Alex Perez', contactInfo: '+1 555-0192' }, { name: 'David Kim', contactInfo: '+1 555-0843' }] },
      two_factor_authentication: { name: 'two_factor_authentication', type: 'info', items: [{ label: 'Two-Factor Authentication', value: 'Configured with SMS Verification' }] }
    });
    setDmThreads([
      { threadKey: '1', title: 'Alex Perez', participants: ['alexperez'], messageCount: 1420, latestDate: 'Yesterday' },
      { threadKey: '2', title: 'Sarah Adams', participants: ['sarah_adams'], messageCount: 680, latestDate: '3 days ago' },
      { threadKey: '3', title: 'Design Community', participants: ['david_kim', 'emilyrose'], messageCount: 412, latestDate: 'Last week' }
    ]);
    setLikedAccounts([
      { username: 'natgeo', count: 184 },
      { username: 'nasa', count: 96 },
      { username: 'wired', count: 64 }
    ]);
    setActiveTab('overview');
    showToast('Loaded demo dataset successfully!');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const toggleWhitelist = (handle) => {
    if (!handle) return;
    const clean = handle.toLowerCase().trim();
    setWhitelist((prev) => {
      const next = new Set(prev);
      if (next.has(clean)) {
        next.delete(clean);
        showToast(`Removed @${clean} from VIP Whitelist`);
      } else {
        next.add(clean);
        showToast(`Added @${clean} to VIP Whitelist`);
      }
      saveWhitelist(next);
      return next;
    });
  };

  const handleSaveSnapshot = async () => {
    if (!insights.followers.length && !insights.following.length) {
      showToast('No connection data loaded to snapshot.');
      return;
    }
    const defaultLabel = `Export - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const label = prompt("Enter a label for this snapshot:", defaultLabel);
    if (label === null) return;
    try {
      await saveSnapshot({
        label: label.trim() || defaultLabel,
        followers: insights.followers,
        following: insights.following,
      });
      showToast('Saved snapshot to Time-Machine!');
    } catch (e) {
      showToast('Error saving snapshot.');
    }
  };

  const handleLoadSnapshotIntoStudio = (snapshot) => {
    if (!snapshot) return;
    setDataSets({
      followers_1: { name: 'followers_1', type: 'users', items: snapshot.followers || [] },
      following: { name: 'following', type: 'users', items: snapshot.following || [] }
    });
    showToast(`Loaded "${snapshot.label}" into Studio!`);
  };

  const processFileContent = (fileName, content) => {
    const baseName = fileName.split(/[/\\]/).pop().replace(/\.json$/i, '');
    const lower = baseName.toLowerCase();

    // 1. Filter out irrelevant system/media files
    if (!isValidArchiveFile(baseName)) {
      return null;
    }

    // 2. Hashtags (following_hashtags.json)
    if (lower.includes('hashtag')) {
      const hashtags = parseHashtags(content);
      return { name: baseName, type: 'hashtags', items: hashtags };
    }

    // 3. Synced Contacts (synced_contacts.json)
    if (lower.includes('contact')) {
      const contacts = parseSyncedContacts(content);
      return { name: baseName, type: 'contacts', items: contacts };
    }

    // 4. Info / Settings / Security / Profile Changes / Autofill
    const isInfoFile = [
      'personal_information',
      'profile_changes',
      'instagram_profile_information',
      'profile_information',
      'two_factor',
      'two_factor_authentication',
      'autofill_information',
      'autofill'
    ].some(p => lower.includes(p));

    if (isInfoFile) {
      const records = parseInfoRecords(content, baseName);
      return { name: baseName, type: 'info', items: records };
    }

    // 5. Followers, following, and other connection user account lists
    const users = parseInstagramAccounts(content);
    return { name: baseName, type: 'users', items: users };
  };

  // 1. Smart ZIP Upload
  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const newSets = {};

      const paths = Object.keys(loadedZip.files).filter(
        (p) => !loadedZip.files[p].dir && p.toLowerCase().endsWith('.json')
      );

      // Prioritize files in connections/followers_and_following
      paths.sort((a, b) => {
        const aConn = a.toLowerCase().includes('followers_and_following') ? 1 : 0;
        const bConn = b.toLowerCase().includes('followers_and_following') ? 1 : 0;
        return aConn - bConn;
      });

      const extractedDMs = [];
      let extractedLikes = [];

      for (const relativePath of paths) {
        const lower = relativePath.toLowerCase();

        // 1. Detect DM messages (messages/inbox/.../*.json)
        if (lower.includes('inbox') && lower.endsWith('.json')) {
          try {
            const content = await loadedZip.files[relativePath].async('string');
            const thread = parseMessageThread(content, relativePath);
            if (thread && thread.messageCount > 0) {
              extractedDMs.push(thread);
            }
          } catch (e) {}
          continue;
        }

        // 2. Detect Liked Posts (liked_posts.json)
        if (lower.includes('liked_posts') || lower.includes('likes_media_likes')) {
          try {
            const content = await loadedZip.files[relativePath].async('string');
            const likes = parseLikedPosts(content);
            if (likes.length) extractedLikes = likes;
          } catch (e) {}
        }

        const content = await loadedZip.files[relativePath].async('string');
        const res = processFileContent(relativePath, content);
        if (res && res.items && res.items.length > 0) {
          newSets[res.name] = res;
        }
      }

      if (extractedDMs.length > 0) {
        extractedDMs.sort((a, b) => b.messageCount - a.messageCount);
        setDmThreads(extractedDMs);
      }
      if (extractedLikes.length > 0) {
        setLikedAccounts(extractedLikes);
      }

      if (Object.keys(newSets).length === 0) {
        alert("No valid Instagram connection files found in this ZIP archive.");
      } else {
        setDataSets(newSets);
        showToast(`Loaded ${Object.keys(newSets).length} connection lists!`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to read ZIP archive. Please ensure it's a valid file.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Multi-File JSON Upload
  const handleMultiUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLoading(true);
    const newSets = { ...dataSets };

    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const lower = file.name.toLowerCase();

        if (lower.includes('inbox') || lower.includes('message')) {
          const thread = parseMessageThread(text, file.name);
          if (thread) {
            setDmThreads((prev) => [thread, ...prev].sort((a, b) => b.messageCount - a.messageCount));
          }
        }
        if (lower.includes('liked_posts') || lower.includes('likes_media')) {
          const likes = parseLikedPosts(text);
          if (likes.length) setLikedAccounts(likes);
        }

        const res = processFileContent(file.name, text);
        if (res && res.items && res.items.length > 0) {
          newSets[res.name] = res;
        }
      }
    }

    setDataSets(newSets);
    setLoading(false);
    showToast(`Loaded ${Object.keys(newSets).length} connection files!`);
  };

  // 3. Slot Uploads
  const handleSlotUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = processFileContent(file.name, text);
    if (res) {
      if (type === 'followers') {
        setSlotFollowers({ name: res.name, items: res.items });
      } else {
        setSlotFollowing({ name: res.name, items: res.items });
      }
    }
  };

  const confirmSlotUpload = () => {
    if (!slotFollowers || !slotFollowing) return;
    setDataSets({
      followers_1: { name: 'followers_1', type: 'users', items: slotFollowers.items },
      following: { name: 'following', type: 'users', items: slotFollowing.items },
    });
    showToast("Followers and Following data loaded!");
  };

  // 4. Direct JSON Paste
  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) return;
    const users = parseInstagramAccounts(pasteContent);
    if (users.length === 0) {
      alert("No usernames could be detected in the pasted text.");
      return;
    }
    if (pasteType === 'followers') {
      setSlotFollowers({ name: 'pasted_followers', items: users });
      setUploadMode('slots');
      showToast(`Extracted ${users.length} followers from text!`);
    } else {
      setSlotFollowing({ name: 'pasted_following', items: users });
      setUploadMode('slots');
      showToast(`Extracted ${users.length} following from text!`);
    }
  };

  // Computed Network Intelligence
  const insights = useMemo(() => {
    const followersAccum = [];
    const followingAccum = [];
    const extraFiles = {};

    // 1. Build a global username -> display name dictionary from all user files
    const globalNameMap = new Map();

    Object.keys(dataSets).forEach((key) => {
      const trimmed = key.trim();
      const fileData = dataSets[key];
      const items = Array.isArray(fileData) ? fileData : fileData.items || [];

      // Collect known display names
      if (fileData.type === 'users') {
        items.forEach((it) => {
          const u = typeof it === 'string' ? it : it.username;
          const n = typeof it === 'string' ? '' : it.name;
          if (u && n && n !== u && !globalNameMap.has(u)) {
            globalNameMap.set(u, n);
          }
        });
      }

      // Strict matching for core followers and following lists
      const isFollowers = isFollowersFile(trimmed);
      const isFollowing = isFollowingFile(trimmed);

      if (isFollowers && (!fileData.type || fileData.type === 'users')) {
        followersAccum.push(...items);
      } else if (isFollowing && (!fileData.type || fileData.type === 'users')) {
        followingAccum.push(...items);
      } else {
        extraFiles[key] = fileData;
      }
    });

    // Helper to normalize an item into { username, name }
    const normalizeUser = (item) => {
      const username = typeof item === 'string' ? item : item.username;
      const name = globalNameMap.get(username) || (typeof item === 'object' && item.name ? item.name : username);
      return { username, name };
    };

    // Maps keyed by username
    const followersMap = new Map();
    followersAccum.forEach((it) => {
      const u = typeof it === 'string' ? it : it.username;
      if (u && !followersMap.has(u)) followersMap.set(u, normalizeUser(it));
    });

    const followingMap = new Map();
    followingAccum.forEach((it) => {
      const u = typeof it === 'string' ? it : it.username;
      if (u && !followingMap.has(u)) followingMap.set(u, normalizeUser(it));
    });

    // Accounts you follow who do NOT follow back
    const notFollowingMeBack = [];
    followingMap.forEach((userObj, u) => {
      if (!followersMap.has(u)) notFollowingMeBack.push(userObj);
    });

    // Accounts who follow you whom you do NOT follow back
    const imNotFollowingBack = [];
    followersMap.forEach((userObj, u) => {
      if (!followingMap.has(u)) imNotFollowingBack.push(userObj);
    });

    // Mutual friends
    const mutuals = [];
    followingMap.forEach((userObj, u) => {
      if (followersMap.has(u)) mutuals.push(userObj);
    });

    // Cross-file ghost / deactivated candidates:
    // Accounts appearing in other lists (e.g. close_friends, hide_story_from) but missing from following/followers
    const ghostCandidates = [];
    const seenGhost = new Set();
    Object.keys(extraFiles).forEach((fileKey) => {
      const extra = extraFiles[fileKey];
      if (extra && extra.type === 'users' && Array.isArray(extra.items)) {
        extra.items.forEach((item) => {
          const u = typeof item === 'string' ? item : item.username;
          if (u && !followersMap.has(u) && !followingMap.has(u) && !seenGhost.has(u)) {
            seenGhost.add(u);
            ghostCandidates.push({
              username: u,
              name: typeof item === 'object' && item.name ? item.name : (globalNameMap.get(u) || u),
              source: fileKey
            });
          }
        });
      }
    });

    const hashtagsCount = extraFiles['following_hashtags']?.items?.length || 0;

    return {
      followers: Array.from(followersMap.values()),
      following: Array.from(followingMap.values()),
      notFollowingMeBack,
      imNotFollowingBack,
      mutuals,
      followersSet: new Set(followersMap.keys()),
      followingSet: new Set(followingMap.keys()),
      extraFiles,
      hasCoreData: followersMap.size > 0 || followingMap.size > 0,
      globalNameMap,
      ghostCandidates,
      hashtagsCount
    };
  }, [dataSets]);

  // Current file data when viewing extra tabs
  const currentExtraData = useMemo(() => {
    if (activeTab === 'extra' && selectedRawFile && insights.extraFiles[selectedRawFile]) {
      const data = insights.extraFiles[selectedRawFile];
      if (Array.isArray(data)) return { type: 'users', items: data };
      return data;
    }
    return null;
  }, [activeTab, selectedRawFile, insights]);

  // Security & Privacy Health Scorecard computation
  const securityData = useMemo(() => {
    return computeSecurityHealth(dataSets);
  }, [dataSets]);

  // Whitelisted accounts list
  const whitelistedAccounts = useMemo(() => {
    const list = [];
    const seen = new Set();
    const allUsers = [...insights.following, ...insights.followers];
    allUsers.forEach((u) => {
      const uname = typeof u === 'string' ? u : u.username;
      if (uname && whitelist.has(uname.toLowerCase()) && !seen.has(uname.toLowerCase())) {
        seen.add(uname.toLowerCase());
        list.push(u);
      }
    });
    whitelist.forEach((handle) => {
      if (!seen.has(handle)) {
        list.push({ username: handle, name: handle });
      }
    });
    return list;
  }, [insights, whitelist]);

  const whitelistedInNotFollowingCount = useMemo(() => {
    return insights.notFollowingMeBack.filter((u) =>
      whitelist.has((typeof u === 'string' ? u : u.username).toLowerCase())
    ).length;
  }, [insights.notFollowingMeBack, whitelist]);

  // Active items list (users, hashtags, or contacts)
  const activeItems = useMemo(() => {
    let items = [];
    if (activeTab === 'whitelist') {
      items = whitelistedAccounts;
    } else if (activeTab === 'not_following_back') {
      items = filterOutWhitelisted
        ? insights.notFollowingMeBack.filter((u) => !whitelist.has((typeof u === 'string' ? u : u.username).toLowerCase()))
        : insights.notFollowingMeBack;
    } else if (activeTab === 'fans') {
      items = insights.imNotFollowingBack;
    } else if (activeTab === 'mutuals') {
      items = insights.mutuals;
    } else if (activeTab === 'followers_all') {
      items = insights.followers;
    } else if (activeTab === 'following_all') {
      items = insights.following;
    } else if (currentExtraData) {
      items = currentExtraData.items || [];
    }

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (currentExtraData?.type === 'contacts') {
        items = items.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.contactInfo && c.contactInfo.toLowerCase().includes(q))
        );
      } else if (currentExtraData?.type === 'info') {
        items = items.filter(
          (r) =>
            (r.label && r.label.toLowerCase().includes(q)) ||
            (r.value && r.value.toLowerCase().includes(q))
        );
      } else if (currentExtraData?.type === 'hashtags') {
        items = items.filter((h) => typeof h === 'string' && h.toLowerCase().includes(q));
      } else {
        items = items.filter((u) => {
          const uname = (typeof u === 'string' ? u : u.username || '').toLowerCase();
          const pname = (typeof u === 'string' ? '' : u.name || '').toLowerCase();
          return uname.includes(q) || pname.includes(q);
        });
      }
    }

    // Sort order
    const sorted = [...items];
    if (currentExtraData?.type === 'contacts') {
      if (sortOrder === 'az') sorted.sort((a, b) => a.name.localeCompare(b.name));
      else if (sortOrder === 'za') sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else if (currentExtraData?.type === 'info') {
      if (sortOrder === 'az') sorted.sort((a, b) => a.label.localeCompare(b.label));
      else if (sortOrder === 'za') sorted.sort((a, b) => b.label.localeCompare(a.label));
    } else if (currentExtraData?.type === 'hashtags') {
      if (sortOrder === 'az') sorted.sort((a, b) => a.localeCompare(b));
      else if (sortOrder === 'za') sorted.sort((a, b) => b.localeCompare(a));
    } else {
      if (sortOrder === 'az') {
        sorted.sort((a, b) => {
          const nameA = (typeof a === 'string' ? a : a.name || a.username || '');
          const nameB = (typeof b === 'string' ? b : b.name || b.username || '');
          return nameA.localeCompare(nameB);
        });
      } else if (sortOrder === 'za') {
        sorted.sort((a, b) => {
          const nameA = (typeof a === 'string' ? a : a.name || a.username || '');
          const nameB = (typeof b === 'string' ? b : b.name || b.username || '');
          return nameB.localeCompare(nameA);
        });
      }
    }

    return sorted;
  }, [activeTab, currentExtraData, insights, searchQuery, sortOrder]);

  // Diagnostic Lookup Status
  const diagnosticResult = useMemo(() => {
    if (!diagUsername.trim()) return null;
    const handle = cleanUsername(diagUsername);
    if (!handle) return { status: 'invalid', message: 'Enter a valid Instagram username format.' };

    const inFollowing = insights.following.some(u => (typeof u === 'string' ? u : u.username) === handle);
    const inFollowers = insights.followers.some(u => (typeof u === 'string' ? u : u.username) === handle);

    return {
      handle,
      inFollowing,
      inFollowers,
      status:
        inFollowing && inFollowers
          ? 'mutual'
          : inFollowing && !inFollowers
          ? 'not_following_back'
          : !inFollowing && inFollowers
          ? 'fan'
          : 'not_found',
    };
  }, [diagUsername, insights]);

  // Export Actions
  const copyAllItems = () => {
    if (!activeItems.length) return;
    let text = '';
    if (currentExtraData?.type === 'contacts') {
      text = activeItems.map((c) => `${c.name}: ${c.contactInfo}`).join('\n');
    } else if (currentExtraData?.type === 'hashtags') {
      text = activeItems.map((h) => `#${h}`).join('\n');
    } else if (currentExtraData?.type === 'info') {
      text = activeItems.map((r) => `${r.label}: ${r.value}${r.date ? ` (Recorded: ${r.date})` : ''}`).join('\n');
    } else {
      text = activeItems.map((u) => {
        const username = typeof u === 'string' ? u : u.username;
        const name = typeof u === 'string' ? '' : u.name;
        return name && name !== username ? `${name} (@${username})` : `@${username}`;
      }).join('\n');
    }
    navigator.clipboard.writeText(text);
    showToast(`Copied ${activeItems.length} items to clipboard!`);
  };

  const exportCsv = () => {
    if (!activeItems.length) return;
    let rows = [];
    if (currentExtraData?.type === 'contacts') {
      rows = ['Name,Contact Information', ...activeItems.map((c) => `"${c.name}","${c.contactInfo}"`)];
    } else if (currentExtraData?.type === 'hashtags') {
      rows = ['Hashtag,Explore URL', ...activeItems.map((h) => `"#${h}","https://www.instagram.com/explore/tags/${h}/"`)];
    } else if (currentExtraData?.type === 'info') {
      rows = ['Field / Label,Value,Date', ...activeItems.map((r) => `"${r.label}","${r.value.replace(/"/g, '""')}","${r.date || ''}"`)];
    } else {
      rows = [
        'Profile Name,Username,Instagram URL',
        ...activeItems.map((u) => {
          const username = typeof u === 'string' ? u : u.username;
          const name = typeof u === 'string' ? '' : u.name || '';
          return `"${name.replace(/"/g, '""')}","${username}","https://www.instagram.com/${username}/"`;
        })
      ];
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab === 'extra' ? selectedRawFile : activeTab}_export.csv`;
    link.click();
    showToast('Downloaded CSV export!');
  };

  const hasData = Object.keys(dataSets).length > 0;
  const extraKeys = Object.keys(insights.extraFiles);

  const formatTitle = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const getItemCount = (fileObj) => {
    if (!fileObj) return 0;
    if (Array.isArray(fileObj)) return fileObj.length;
    return fileObj.items ? fileObj.items.length : 0;
  };
  return (
    <div className="bento-shell">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* --- Bento Sidebar --- */}
      <aside className={`bento-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div className="bento-brand">
          <div className="brand-identity" onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}>
            <div className="brand-logo-gem">
              <IconZap size={16} />
            </div>
            <div className="brand-text-wrap">
              <span className="brand-app-name">
                InstaLens
                <span className="brand-badge-pill">AI</span>
              </span>
              <span className="brand-subtext">Network Intelligence</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconClose size={13} />
          </button>
        </div>

        {/* Navigation Sections (All 100% Vector SVG Icons) */}
        <div className="bento-nav-section">
          <div className="nav-section-label">General</div>
          <button
            className={`nav-item-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconDashboard size={15} /></span>
              <span>Dashboard</span>
            </div>
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'not_following_back' ? 'active' : ''}`}
            onClick={() => { setActiveTab('not_following_back'); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconUserMinus size={15} /></span>
              <span>Non-Followers</span>
            </div>
            {hasData && (
              <span className="nav-counter-pill alert-rose">
                {insights.notFollowingMeBack.length}
              </span>
            )}
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'mutuals' ? 'active' : ''}`}
            onClick={() => { setActiveTab('mutuals'); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconUsers size={15} /></span>
              <span>Mutual Friends</span>
            </div>
            {hasData && (
              <span className="nav-counter-pill alert-green">
                {insights.mutuals.length}
              </span>
            )}
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'fans' ? 'active' : ''}`}
            onClick={() => { setActiveTab('fans'); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconUserCheck size={15} /></span>
              <span>Fans & Admirers</span>
            </div>
            {hasData && (
              <span className="nav-counter-pill">
                {insights.imNotFollowingBack.length}
              </span>
            )}
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'whitelist' ? 'active' : ''}`}
            onClick={() => { setActiveTab('whitelist'); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconStar size={15} /></span>
              <span>VIP Whitelist</span>
            </div>
            {whitelist.size > 0 && (
              <span className="nav-counter-pill alert-amber">
                {whitelist.size}
              </span>
            )}
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'following_all' ? 'active' : ''}`}
            onClick={() => { setActiveTab('following_all'); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconUsers size={15} /></span>
              <span>All Following</span>
            </div>
            {hasData && <span className="nav-counter-pill">{insights.following.length}</span>}
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'followers_all' ? 'active' : ''}`}
            onClick={() => { setActiveTab('followers_all'); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconUsers size={15} /></span>
              <span>All Followers</span>
            </div>
            {hasData && <span className="nav-counter-pill">{insights.followers.length}</span>}
          </button>

          <div className="nav-section-label" style={{ marginTop: '10px' }}>AI Tools & Activity</div>
          <button
            className="nav-item-btn"
            onClick={() => { setShowReviewQueue(true); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconZap size={15} /></span>
              <span>Fast Review Queue</span>
            </div>
          </button>

          <button
            className="nav-item-btn"
            onClick={() => { setShowEngagementHub(true); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconMessage size={15} /></span>
              <span>DMs & Messages</span>
            </div>
            {dmThreads.length > 0 && <span className="nav-counter-pill">{dmThreads.length}</span>}
          </button>

          <button
            className="nav-item-btn"
            onClick={() => { setShowTimeMachine(true); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconClock size={15} /></span>
              <span>Time-Machine</span>
            </div>
          </button>

          <button
            className="nav-item-btn"
            onClick={() => { setShowSecurityScorecard(true); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconShield size={15} /></span>
              <span>Security Audit</span>
            </div>
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => { setActiveTab('upload'); setSidebarOpen(false); }}
          >
            <div className="nav-item-content">
              <span className="nav-item-icon"><IconUpload size={15} /></span>
              <span>Import Archive</span>
            </div>
          </button>
        </div>

        {/* Sidebar Bottom AI Pro Card */}
        <div className="sidebar-bottom-card">
          <div className="card-pro-title">
            <IconShield size={14} />
            <span>AI Network Engine</span>
          </div>
          <p className="card-pro-desc">
            100% Client-Side Privacy. Your data never leaves your browser.
          </p>
          {hasData ? (
            <button
              className="bento-btn bento-btn-danger bento-btn-sm"
              style={{ width: '100%', borderRadius: 'var(--bento-radius-md)' }}
              onClick={() => {
                if (confirm("Reset current session and switch archive?")) {
                  setDataSets({});
                  setSlotFollowers(null);
                  setSlotFollowing(null);
                  setDmThreads([]);
                  setLikedAccounts([]);
                  setActiveTab('upload');
                  showToast("Session reset.");
                }
              }}
            >
              <IconRefreshCw size={12} />
              Reset Session
            </button>
          ) : (
            <button
              className="bento-btn bento-btn-primary bento-btn-sm"
              style={{ width: '100%', borderRadius: 'var(--bento-radius-md)' }}
              onClick={loadDemoData}
            >
              <IconZap size={12} />
              Load Demo Data
            </button>
          )}
        </div>
      </aside>

      {/* --- Main Bento Canvas Area --- */}
      <main className="bento-canvas">
        {/* Top App Bar */}
        <header className="bento-topbar">
          <div className="topbar-greeting-wrap">
            <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconDashboard size={15} />
            </button>
            <div className="greeting-text">
              <h2>
                {hasData
                  ? "Welcome Back, Explorer"
                  : "Ready to conquer your network? Welcome to InstaLens"}
              </h2>
              <p>
                {hasData
                  ? `${insights.following.length} following • ${insights.followers.length} followers • ${insights.notFollowingMeBack.length} non-followers`
                  : "AI-powered Instagram audience analytics & unfollow tracking"}
              </p>
            </div>
          </div>

          {/* Centered Search Capsule */}
          <div className="topbar-search-capsule">
            <IconSearch size={13} className="topbar-search-icon" />
            <input
              type="text"
              placeholder="Search anything or @handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Topbar Actions with Vector Icons */}
          <div className="topbar-actions-wrap">
            {!hasData && (
              <button className="bento-btn bento-btn-primary" onClick={loadDemoData}>
                <IconZap size={13} />
                Load Sample Demo
              </button>
            )}

            {hasData && (
              <>
                <button
                  className="bento-btn bento-btn-primary"
                  onClick={() => setShowReviewQueue(true)}
                  title="Fast Unfollow Queue"
                >
                  <IconZap size={13} />
                  Fast Review
                </button>
                <button
                  className="bento-btn bento-btn-secondary"
                  onClick={handleSaveSnapshot}
                  title="Save Snapshot to Time-Machine"
                >
                  <IconClock size={13} />
                  Snapshot
                </button>
                <button
                  className="bento-btn bento-btn-secondary"
                  onClick={exportCsv}
                  title="Export to CSV"
                >
                  <IconDownload size={13} />
                  CSV
                </button>
              </>
            )}

            <button
              className="bento-btn bento-btn-dark"
              onClick={() => setActiveTab('upload')}
            >
              <IconUpload size={13} />
              Upload
            </button>

            {/* Notification Bell with indicator */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--bento-card-subtle)',
                border: '1px solid var(--bento-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bento-text-muted)',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={() => showToast("AI Engine: All systems synchronized.")}
            >
              <IconBell size={15} />
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10B981'
                }}
              />
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        {activeTab === 'upload' || (!hasData && activeTab !== 'overview') ? (
          /* VIEW: UPLOAD & ONBOARDING */
          <div className="bento-card onboarding-bento-card">
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bento-accent-soft)', color: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <IconUpload size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bento-text-main)' }}>
              Import Instagram Export Archive
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--bento-text-muted)', marginTop: '4px' }}>
              Drag & drop your Instagram ZIP or JSON connection files to uncover who unfollowed you.
            </p>

            {/* Dropzone */}
            <div
              className={`bento-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                const files = e.dataTransfer?.files;
                if (!files?.length) return;
                const first = files[0];
                if (first.name.toLowerCase().endsWith('.zip')) {
                  handleZipUpload({ target: { files: [first] } });
                } else {
                  handleMultiUpload({ target: { files } });
                }
              }}
              onClick={() => document.getElementById('bento-file-input')?.click()}
            >
              <div style={{ color: 'var(--bento-accent)', marginBottom: '8px' }}>
                <IconUpload size={32} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--bento-text-main)' }}>
                Click to upload or drag & drop ZIP / JSON
              </div>
              <div style={{ fontSize: '12px', color: 'var(--bento-text-muted)', marginTop: '3px' }}>
                Supports full export ZIP or individual <code>followers_1.json</code> & <code>following.json</code>
              </div>
              <input
                id="bento-file-input"
                type="file"
                accept=".zip,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file?.name.toLowerCase().endsWith('.zip')) {
                    handleZipUpload(e);
                  } else {
                    handleMultiUpload(e);
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button className="bento-btn bento-btn-primary" onClick={loadDemoData}>
                <IconZap size={14} />
                Load Sample Demo Data Immediately
              </button>
              <button
                className="bento-btn bento-btn-secondary"
                onClick={() => alert("To export from Instagram:\n1. Open Instagram Settings -> Accounts Center -> Your Information and Permissions.\n2. Tap 'Download your information'.\n3. Select 'JSON' format and 'All time'.")}
              >
                Export Guide
              </button>
            </div>
          </div>
        ) : activeTab === 'overview' ? (
          /* VIEW: DASHBOARD */
          <div className="bento-grid-dashboard">
            {/* Row 1: Hero Intelligence Tile with Real SVG Donut + 3 KPI Tiles */}
            <div className="bento-metrics-row">
              {/* Tile 1: Hero Intelligence Bento with SVG Donut Allocation Chart */}
              <div className="bento-card bento-hero-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div className="hero-pill-badge">
                      <span className="hero-pill-dot"></span>
                      <span>AI Network Intelligence</span>
                    </div>
                    <h3 className="hero-headline" style={{ fontSize: '16px' }}>
                      Audience Reciprocity & Allocation
                    </h3>
                    <p className="hero-subheadline" style={{ fontSize: '11.5px', marginBottom: '14px' }}>
                      {hasData
                        ? `${insights.notFollowingMeBack.length} of your ${insights.following.length} following do not follow back. Review below.`
                        : "Welcome to InstaLens! Load your archive or test with demo data."}
                    </p>
                    <div className="hero-actions-group">
                      {hasData ? (
                        <>
                          <button className="bento-btn bento-btn-primary bento-btn-sm" onClick={() => setShowReviewQueue(true)}>
                            <IconZap size={12} />
                            Start Fast Review ({insights.notFollowingMeBack.length})
                          </button>
                          <button className="bento-btn bento-btn-secondary bento-btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }} onClick={() => setShowTimeMachine(true)}>
                            <IconClock size={12} />
                            Time-Machine
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="bento-btn bento-btn-primary bento-btn-sm" onClick={loadDemoData}>
                            <IconZap size={12} />
                            Load Sample Demo Data
                          </button>
                          <button className="bento-btn bento-btn-secondary bento-btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }} onClick={() => setActiveTab('upload')}>
                            <IconUpload size={12} />
                            Upload Archive
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Donut Allocation Chart */}
                  <div style={{ flexShrink: 0 }}>
                    <DonutAllocationChart
                      mutuals={insights.mutuals.length}
                      nonFollowers={insights.notFollowingMeBack.length}
                      fans={insights.imNotFollowingBack.length}
                      size={96}
                    />
                  </div>
                </div>
              </div>

              {/* Tile 2: Non-Followers */}
              <div
                className="bento-card metric-bento-card"
                onClick={() => setActiveTab('not_following_back')}
              >
                <div className="metric-bento-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="metric-bento-icon" style={{ background: 'var(--bento-rose-soft)', color: 'var(--bento-rose)' }}>
                      <IconUserMinus size={14} />
                    </div>
                    <span className="metric-bento-title">Non-Followers</span>
                  </div>
                  <span style={{ color: 'var(--bento-text-light)', display: 'flex' }}>
                    <IconArrowUpRight size={12} />
                  </span>
                </div>

                <div className="metric-bento-value" style={{ color: 'var(--bento-rose)' }}>
                  {insights.notFollowingMeBack.length}
                </div>

                {/* 100% Full-Width Smooth Wave Sparkline */}
                <div className="metric-chart-wrap">
                  <SmoothWaveSparkline color="red" height={36} />
                </div>

                {/* Trend Capsule Pill */}
                <div className="metric-trend-pill pill-rose">
                  <IconTrendingDown size={11} />
                  <span>
                    {insights.following.length > 0
                      ? `${Math.round((insights.notFollowingMeBack.length / insights.following.length) * 100)}% non-reciprocal`
                      : '0% non-reciprocal'}
                  </span>
                </div>
              </div>

              {/* Tile 3: Mutual Connections Bento */}
              <div
                className="bento-card metric-bento-card"
                onClick={() => setActiveTab('mutuals')}
              >
                <div className="metric-bento-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="metric-bento-icon" style={{ background: 'var(--bento-accent-soft)', color: 'var(--bento-accent)' }}>
                      <IconUsers size={14} />
                    </div>
                    <span className="metric-bento-title">Mutual Friends</span>
                  </div>
                  <span style={{ color: 'var(--bento-text-light)', display: 'flex' }}>
                    <IconArrowUpRight size={12} />
                  </span>
                </div>

                <div className="metric-bento-value" style={{ color: 'var(--bento-accent)' }}>
                  {insights.mutuals.length}
                </div>

                {/* 100% Full-Width Smooth Wave Sparkline */}
                <div className="metric-chart-wrap">
                  <SmoothWaveSparkline color="green" height={36} />
                </div>

                {/* Trend Capsule Pill */}
                <div className="metric-trend-pill pill-green">
                  <IconTrendingUp size={11} />
                  <span>
                    {insights.following.length > 0
                      ? `${Math.round((insights.mutuals.length / insights.following.length) * 100)}% mutual reciprocity`
                      : '0% mutual'}
                  </span>
                </div>
              </div>

              {/* Tile 4: VIP Whitelist Bento */}
              <div
                className="bento-card metric-bento-card"
                onClick={() => setActiveTab('whitelist')}
              >
                <div className="metric-bento-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="metric-bento-icon" style={{ background: 'var(--bento-amber-soft)', color: 'var(--bento-amber)' }}>
                      <IconStar size={14} filled={true} />
                    </div>
                    <span className="metric-bento-title">Protected VIPs</span>
                  </div>
                  <span style={{ color: 'var(--bento-text-light)', display: 'flex' }}>
                    <IconArrowUpRight size={12} />
                  </span>
                </div>

                <div className="metric-bento-value" style={{ color: 'var(--bento-amber)' }}>
                  {whitelist.size}
                </div>

                {/* 100% Full-Width Smooth Wave Sparkline */}
                <div className="metric-chart-wrap">
                  <SmoothWaveSparkline color="amber" height={36} />
                </div>

                {/* Trend Capsule Pill */}
                <div className="metric-trend-pill pill-amber">
                  <IconStar size={11} filled={true} />
                  <span>{whitelist.size} Protected</span>
                </div>
              </div>
            </div>

            {/* Row 2: Main Two-Column Bento Layout */}
            <div className="bento-two-columns">
              {/* Left Column: Audience Explorer Bento Table */}
              <div className="bento-card bento-explorer-card">
                {/* Segmented Pill Tabs */}
                <div className="explorer-top-tabs">
                  <button
                    className={`bento-tab-pill ${activeTab === 'not_following_back' ? 'active' : ''}`}
                    onClick={() => setActiveTab('not_following_back')}
                  >
                    Non-Followers ({insights.notFollowingMeBack.length})
                  </button>
                  <button
                    className={`bento-tab-pill ${activeTab === 'mutuals' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mutuals')}
                  >
                    Mutuals ({insights.mutuals.length})
                  </button>
                  <button
                    className={`bento-tab-pill ${activeTab === 'fans' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fans')}
                  >
                    Fans ({insights.imNotFollowingBack.length})
                  </button>
                  <button
                    className={`bento-tab-pill ${activeTab === 'whitelist' ? 'active' : ''}`}
                    onClick={() => setActiveTab('whitelist')}
                  >
                    VIPs ({whitelist.size})
                  </button>
                </div>

                {/* Subheader Quick Review List */}
                <div style={{ padding: '12px 16px 6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--bento-text-main)' }}>
                    Top Non-Followers Quick Review
                  </span>
                  <button
                    className="bento-btn bento-btn-secondary bento-btn-sm"
                    onClick={() => setActiveTab('not_following_back')}
                  >
                    Explore Full List
                    <IconArrowUpRight size={11} />
                  </button>
                </div>

                {/* User Row Items */}
                <div className="bento-user-list">
                  {insights.notFollowingMeBack.slice(0, 6).map((user, idx) => {
                    const username = typeof user === 'string' ? user : user.username;
                    const name = typeof user === 'string' ? '' : user.name;
                    const isVip = whitelist.has(username.toLowerCase());
                    return (
                      <div key={`${username}-${idx}`} className="bento-user-row">
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                          <UserAvatar username={username} name={name} />
                          <div className="bento-user-meta">
                            <span className="bento-user-name">{name || username}</span>
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
              </div>

              {/* Right Column: AI Scorecard & Direct Messages Bento */}
              <div className="right-bento-column">
                {/* Bento Card: AI Security Scorecard */}
                <div className="bento-card scorecard-bento-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <IconShield size={16} />
                      <span>Security & Privacy Scorecard</span>
                    </div>
                    <button
                      className="bento-btn bento-btn-secondary bento-btn-sm"
                      onClick={() => setShowSecurityScorecard(true)}
                    >
                      Audit
                      <IconArrowUpRight size={10} />
                    </button>
                  </div>

                  <div className="scorecard-hero-row">
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--bento-text-muted)' }}>
                        Account Rating
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--bento-text-main)', marginTop: '2px' }}>
                        {securityData.score >= 80 ? 'Strong Protection' : 'Risks Detected'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--bento-text-muted)', marginTop: '2px' }}>
                        Evaluated against 2FA & data sync exposure.
                      </div>
                    </div>

                    <div className="score-circular-badge">
                      <span className="score-grade-text">{securityData.grade}</span>
                      <span className="score-num-text">{securityData.score}/100</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {securityData.findings.slice(0, 2).map((f, i) => (
                      <div key={i} style={{ padding: '6px 10px', background: 'var(--bento-card-subtle)', borderRadius: 'var(--bento-radius-sm)', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {f.type === 'good' ? <IconCheckCircle size={14} /> : <IconAlertTriangle size={14} />}
                        <span style={{ fontWeight: 600, color: 'var(--bento-text-main)' }}>{f.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bento Card: Direct Messages & Engagement */}
                <div className="bento-card dms-bento-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <IconMessage size={16} />
                      <span>Top Direct Conversations</span>
                    </div>
                    <button
                      className="bento-btn bento-btn-secondary bento-btn-sm"
                      onClick={() => setShowEngagementHub(true)}
                    >
                      Studio
                      <IconArrowUpRight size={10} />
                    </button>
                  </div>

                  {dmThreads.length > 0 ? (
                    <div>
                      {dmThreads.slice(0, 3).map((t, idx) => (
                        <div key={idx} className="dm-thread-item">
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bento-text-main)' }}>
                            {t.title}
                          </span>
                          <span className="nav-counter-pill alert-green">
                            {t.messageCount.toLocaleString()} msgs
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11.5px', color: 'var(--bento-text-muted)', padding: '6px 0' }}>
                      Include your Messages inbox export to rank top chat conversations.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW: FULL AUDIENCE EXPLORER TABLE */
          <div className="bento-card bento-explorer-card">
            {/* Header */}
            <div className="explorer-card-header">
              <div className="explorer-header-left">
                <h2>
                  {activeTab === 'not_following_back' && 'Non-Followers'}
                  {activeTab === 'mutuals' && 'Mutual Friends'}
                  {activeTab === 'fans' && 'Fans & Admirers'}
                  {activeTab === 'whitelist' && 'VIP Whitelist'}
                  {activeTab === 'following_all' && 'All Following'}
                  {activeTab === 'followers_all' && 'All Followers'}
                  <span className="nav-counter-pill" style={{ fontSize: '11px' }}>
                    {activeItems.length} records
                  </span>
                </h2>
                <p>
                  {activeTab === 'not_following_back' && 'Accounts you follow who do not follow your profile back.'}
                  {activeTab === 'mutuals' && 'Reciprocal friends where both profiles follow each other.'}
                  {activeTab === 'fans' && 'Accounts following you whom you do not follow back.'}
                  {activeTab === 'whitelist' && 'Starred accounts protected from bulk actions.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="bento-btn bento-btn-secondary bento-btn-sm" onClick={copyAllItems}>
                  <IconCopy size={12} />
                  Copy Handles
                </button>
                <button className="bento-btn bento-btn-secondary bento-btn-sm" onClick={exportCsv}>
                  <IconDownload size={12} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="explorer-search-toolbar">
              <div className="explorer-filter-group">
                {activeTab === 'not_following_back' && (
                  <button
                    className={`bento-filter-chip ${filterOutWhitelisted ? 'active' : ''}`}
                    onClick={() => setFilterOutWhitelisted(!filterOutWhitelisted)}
                  >
                    <IconStar size={12} filled={filterOutWhitelisted} />
                    <span>{filterOutWhitelisted ? 'Hiding VIPs' : 'Hide VIPs'}</span>
                  </button>
                )}

                <select
                  className="bento-select-pill"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="az">Sort: Name (A-Z)</option>
                  <option value="za">Sort: Name (Z-A)</option>
                </select>
              </div>

              {/* In-table Search Capsule */}
              <div className="table-search-pill">
                <IconSearch size={12} />
                <input
                  type="text"
                  placeholder="Filter list..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* User List */}
            <div className="bento-user-list">
              {activeItems.length > 0 ? (
                activeItems.map((item, idx) => {
                  const username = typeof item === 'string' ? item : item.username;
                  const name = typeof item === 'string' ? '' : item.name;
                  const isVip = whitelist.has(username.toLowerCase());

                  return (
                    <div key={`${username}-${idx}`} className="bento-user-row">
                      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <UserAvatar username={username} name={name} />
                        <div className="bento-user-meta">
                          <span className="bento-user-name">{name || username}</span>
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
                })
              ) : (
                <div className="empty-data-state">
                  <div style={{ color: 'var(--bento-text-light)', marginBottom: '8px' }}>
                    <IconSearch size={24} />
                  </div>
                  <h3>No accounts found</h3>
                  <p>Try modifying your search or clearing active filters.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- Modals --- */}
      <TimeMachineModal
        isOpen={showTimeMachine}
        onClose={() => setShowTimeMachine(false)}
        currentInsights={insights}
        whitelist={whitelist}
        toggleWhitelist={toggleWhitelist}
        onLoadSnapshotIntoStudio={handleLoadSnapshotIntoStudio}
        showToast={showToast}
      />

      <EngagementHubModal
        isOpen={showEngagementHub}
        onClose={() => setShowEngagementHub(false)}
        dmThreads={dmThreads}
        likedAccounts={likedAccounts}
        mutuals={insights.mutuals}
        whitelist={whitelist}
        toggleWhitelist={toggleWhitelist}
      />

      <SecurityScorecardModal
        isOpen={showSecurityScorecard}
        onClose={() => setShowSecurityScorecard(false)}
        securityData={securityData}
      />

      <FastReviewQueueModal
        isOpen={showReviewQueue}
        onClose={() => setShowReviewQueue(false)}
        accounts={insights.notFollowingMeBack}
        whitelist={whitelist}
        toggleWhitelist={toggleWhitelist}
        showToast={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="floating-toast">
          <IconZap size={14} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}




export default App;
