// Parsers for Instagram DM messages, likes, and security health audit

// 1. Message Thread Parser (messages/inbox/*/message_1.json)
export function parseMessageThread(contentStr, filePath) {
  try {
    const data = JSON.parse(contentStr.replace(/^\uFEFF/, '').trim());
    const participants = (data.participants || []).map(p => {
      // Decode potential UTF-8 encoding in Instagram export
      try {
        return decodeURIComponent(escape(p.name || ''));
      } catch (e) {
        return p.name || '';
      }
    });

    let title = data.title || participants.join(', ');
    try {
      title = decodeURIComponent(escape(title));
    } catch (e) {}

    const messages = Array.isArray(data.messages) ? data.messages : [];
    const messageCount = messages.length;

    let latestTimestamp = 0;
    let earliestTimestamp = Infinity;

    for (const msg of messages) {
      const ts = msg.timestamp_ms || (msg.timestamp ? msg.timestamp * 1000 : 0);
      if (ts > latestTimestamp) latestTimestamp = ts;
      if (ts < earliestTimestamp && ts > 0) earliestTimestamp = ts;
    }

    // Extract thread folder key
    const folderMatch = filePath.match(/inbox[/\\]([^/\\]+)/i);
    const threadKey = folderMatch ? folderMatch[1] : title;

    return {
      title,
      threadKey,
      participants,
      messageCount,
      latestDate: latestTimestamp > 0 ? new Date(latestTimestamp).toLocaleDateString() : null,
      earliestDate: earliestTimestamp !== Infinity ? new Date(earliestTimestamp).toLocaleDateString() : null,
      latestTimestamp
    };
  } catch (err) {
    return null;
  }
}

// 2. Liked Posts Parser (liked_posts.json)
export function parseLikedPosts(contentStr) {
  const likersMap = new Map();
  try {
    const data = JSON.parse(contentStr.replace(/^\uFEFF/, '').trim());
    const items = Array.isArray(data) ? data : data.likes_media_likes || [];

    for (const item of items) {
      let handle = '';
      if (item.title) {
        handle = item.title.trim().toLowerCase();
      } else if (Array.isArray(item.string_list_data) && item.string_list_data[0]?.href) {
        const m = item.string_list_data[0].href.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/i);
        if (m) handle = m[1].toLowerCase();
      }

      if (handle) {
        likersMap.set(handle, (likersMap.get(handle) || 0) + 1);
      }
    }
  } catch (err) {}

  return Array.from(likersMap.entries())
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count);
}

// 3. Security & Privacy Health Score Calculator
export function computeSecurityHealth(dataSets) {
  let score = 70; // baseline
  const findings = [];
  const recommendations = [];

  const keys = Object.keys(dataSets).map(k => k.toLowerCase());

  // 1. Two-Factor Authentication Check
  const has2FA = keys.some(k => k.includes('two_factor'));
  if (has2FA) {
    score += 15;
    findings.push({
      type: 'good',
      title: 'Two-Factor Authentication (2FA) Configured',
      description: 'Found active 2FA credentials or backup codes in your security configuration.'
    });
  } else {
    score -= 15;
    findings.push({
      type: 'warning',
      title: 'No 2FA Records Detected in Export',
      description: 'Your account may not have Two-Factor Authentication enabled, leaving it vulnerable to credential stuffing.'
    });
    recommendations.push('Enable Two-Factor Authentication via an Authenticator App (Google Authenticator or Duo).');
  }

  // 2. Synced Phonebook Contacts Exposure
  const hasContacts = keys.some(k => k.includes('contact'));
  if (hasContacts) {
    const count = dataSets[Object.keys(dataSets).find(k => k.toLowerCase().includes('contact'))]?.items?.length || 0;
    if (count > 0) {
      score -= 5;
      findings.push({
        type: 'info',
        title: `${count} Synced Phonebook Contacts Stored`,
        description: 'Meta has continuous access to your address book contacts, matching your friends and telephone numbers.'
      });
      recommendations.push('Disable Contact Syncing in Instagram Settings > Account Center > Your Information.');
    }
  }

  // 3. Autofill & Payment Information Exposure
  const hasAutofill = keys.some(k => k.includes('autofill'));
  if (hasAutofill) {
    findings.push({
      type: 'info',
      title: 'Autofill Data Present on Meta Servers',
      description: 'Saved addresses and autofill forms are stored on your Instagram profile.'
    });
  }

  // 4. Profile Changes & Audits
  const hasChanges = keys.some(k => k.includes('changes'));
  if (hasChanges) {
    findings.push({
      type: 'good',
      title: 'Audit Trail Available',
      description: 'Profile updates and history are recorded and accessible in your data archive.'
    });
  }

  score = Math.max(20, Math.min(100, score));

  let grade = 'B';
  let gradeColor = '#ca8a04';
  if (score >= 90) {
    grade = 'A+';
    gradeColor = 'var(--accent-emerald)';
  } else if (score >= 80) {
    grade = 'A';
    gradeColor = 'var(--accent-emerald)';
  } else if (score >= 65) {
    grade = 'B';
    gradeColor = '#ca8a04';
  } else if (score >= 50) {
    grade = 'C';
    gradeColor = 'var(--accent-rose)';
  } else {
    grade = 'D';
    gradeColor = 'var(--accent-rose)';
  }

  return {
    score,
    grade,
    gradeColor,
    findings,
    recommendations
  };
}
