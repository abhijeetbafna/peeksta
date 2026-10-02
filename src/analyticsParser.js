// Parsers for Instagram DM messages, likes, and security health audit

// Helper to fix double-encoded UTF-8 strings common in Instagram JSON exports
export function fixInstagramEncoding(str) {
  if (!str || typeof str !== 'string') return str || '';
  try {
    return decodeURIComponent(escape(str));
  } catch (e) {
    try {
      const bytes = Uint8Array.from([...str].map(c => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (err) {
      return str;
    }
  }
}

// Helper to check if a message is a shared Instagram Reel or post
export function isReelMessage(msg) {
  if (!msg) return false;
  if (msg.share && (msg.share.link || msg.share.shareText)) return true;
  if (msg.type === 'Share') return true;
  const content = (msg.content || '').toLowerCase();
  return (
    content.includes('instagram.com/reel/') ||
    content.includes('instagram.com/reels/') ||
    content.includes('instagram.com/p/') ||
    content.includes('instagram.com/tv/') ||
    content.includes('shared a reel') ||
    content.includes('shared a post')
  );
}

// 1. Message Thread Parser (messages/inbox/*/message_1.json)
export function parseMessageThread(contentStr, filePath) {
  try {
    const data = JSON.parse(contentStr.replace(/^\uFEFF/, '').trim());
    const participants = (data.participants || []).map(p => fixInstagramEncoding(p.name || ''));

    let title = fixInstagramEncoding(data.title || participants.join(', '));

    const rawMessages = Array.isArray(data.messages) ? data.messages : [];
    
    let photosCount = 0;
    let videosCount = 0;
    let audioCount = 0;
    let reactionsCount = 0;
    let reelsCount = 0;

    const parsedMessages = rawMessages.map((msg, idx) => {
      const ts = msg.timestamp_ms || (msg.timestamp ? msg.timestamp * 1000 : 0);
      const sender = fixInstagramEncoding(msg.sender_name || 'Unknown');
      const content = fixInstagramEncoding(msg.content || '');

      const reactions = Array.isArray(msg.reactions) ? msg.reactions.map(r => {
        reactionsCount++;
        return {
          reaction: fixInstagramEncoding(r.reaction || '❤️'),
          actor: fixInstagramEncoding(r.actor || '')
        };
      }) : [];

      const photos = Array.isArray(msg.photos) ? msg.photos.map(p => {
        photosCount++;
        return { uri: p.uri, timestamp: p.creation_timestamp };
      }) : [];

      const videos = Array.isArray(msg.videos) ? msg.videos.map(v => {
        videosCount++;
        return { uri: v.uri, timestamp: v.creation_timestamp };
      }) : [];

      const audioFiles = Array.isArray(msg.audio_files) ? msg.audio_files.map(a => {
        audioCount++;
        return { uri: a.uri, timestamp: a.creation_timestamp };
      }) : [];

      let share = null;
      if (msg.share) {
        share = {
          link: msg.share.link || '',
          shareText: fixInstagramEncoding(msg.share.share_text || msg.share.link || '')
        };
      }

      // Check edit history fields in Instagram exports
      const isEdited = Boolean(
        msg.is_edited ||
        msg.is_edited_by_user ||
        (msg.edits && msg.edits.length > 0) ||
        (msg.edit_history && msg.edit_history.length > 0) ||
        msg.original_content
      );

      let edits = [];
      if (Array.isArray(msg.edits)) {
        edits = msg.edits.map(e => (typeof e === 'string' ? fixInstagramEncoding(e) : fixInstagramEncoding(e.content || e.text || '')));
      } else if (Array.isArray(msg.edit_history)) {
        edits = msg.edit_history.map(e => (typeof e === 'string' ? fixInstagramEncoding(e) : fixInstagramEncoding(e.content || e.text || '')));
      } else if (msg.original_content) {
        edits = [fixInstagramEncoding(msg.original_content)];
      }

      const parsedMsgObj = {
        id: `msg_${ts}_${idx}`,
        sender,
        timestamp: ts,
        formattedTime: ts > 0 ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        formattedDate: ts > 0 ? new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        content,
        reactions,
        photos,
        videos,
        audioFiles,
        share,
        isEdited,
        edits,
        sticker: msg.sticker ? (msg.sticker.uri || 'sticker') : null,
        type: msg.type || 'Generic'
      };

      if (isReelMessage(parsedMsgObj)) {
        reelsCount++;
      }

      return parsedMsgObj;
    });

    // Extract thread folder key
    const folderMatch = filePath.match(/inbox[/\\]([^/\\]+)/i);
    const threadKey = folderMatch ? folderMatch[1] : title;

    let latestTimestamp = 0;
    let earliestTimestamp = Infinity;

    for (const msg of parsedMessages) {
      if (msg.timestamp > latestTimestamp) latestTimestamp = msg.timestamp;
      if (msg.timestamp < earliestTimestamp && msg.timestamp > 0) earliestTimestamp = msg.timestamp;
    }

    return {
      title,
      threadKey,
      participants,
      messages: parsedMessages,
      messageCount: parsedMessages.length,
      photosCount,
      videosCount,
      audioCount,
      reactionsCount,
      reelsCount,
      latestDate: latestTimestamp > 0 ? new Date(latestTimestamp).toLocaleDateString() : null,
      earliestDate: earliestTimestamp !== Infinity ? new Date(earliestTimestamp).toLocaleDateString() : null,
      latestTimestamp
    };
  } catch (err) {
    return null;
  }
}

// Helper to merge multiple parsed JSON files belonging to the same DM thread directory
export function mergeThreadsList(threadList) {
  const map = new Map();

  for (const thread of threadList) {
    if (!thread || !thread.threadKey) continue;
    const key = thread.threadKey;

    if (!map.has(key)) {
      map.set(key, { ...thread, messages: [...(thread.messages || [])] });
    } else {
      const existing = map.get(key);
      const combinedMessages = [...existing.messages, ...(thread.messages || [])];
      
      // Deduplicate by timestamp + sender + content
      const uniqueMap = new Map();
      for (const m of combinedMessages) {
        const uKey = `${m.timestamp}_${m.sender}_${m.content}`;
        if (!uniqueMap.has(uKey)) {
          uniqueMap.set(uKey, m);
        }
      }
      
      const dedupedMessages = Array.from(uniqueMap.values());
      // Sort messages chronologically (oldest first for chat view)
      dedupedMessages.sort((a, b) => a.timestamp - b.timestamp);

      let pCount = 0, vCount = 0, aCount = 0, rCount = 0, reelCount = 0;
      let maxTs = 0, minTs = Infinity;

      for (const m of dedupedMessages) {
        pCount += (m.photos || []).length;
        vCount += (m.videos || []).length;
        aCount += (m.audioFiles || []).length;
        rCount += (m.reactions || []).length;
        if (isReelMessage(m)) reelCount++;
        if (m.timestamp > maxTs) maxTs = m.timestamp;
        if (m.timestamp < minTs && m.timestamp > 0) minTs = m.timestamp;
      }

      existing.messages = dedupedMessages;
      existing.messageCount = dedupedMessages.length;
      existing.photosCount = pCount;
      existing.videosCount = vCount;
      existing.audioCount = aCount;
      existing.reactionsCount = rCount;
      existing.reelsCount = reelCount;
      existing.latestTimestamp = maxTs;
      existing.latestDate = maxTs > 0 ? new Date(maxTs).toLocaleDateString() : null;
      existing.earliestDate = minTs !== Infinity ? new Date(minTs).toLocaleDateString() : null;
      if (!existing.title && thread.title) existing.title = thread.title;
    }
  }

  // Ensure all threads' messages are sorted chronologically
  const mergedArray = Array.from(map.values()).map(t => {
    if (t.messages && t.messages.length > 0) {
      t.messages.sort((a, b) => a.timestamp - b.timestamp);
    }
    return t;
  });

  // Sort overall thread list by most messages / latest activity
  return mergedArray.sort((a, b) => b.messageCount - a.messageCount);
}

// 2. Thread Conversation Analytics Engine
export function computeThreadAnalytics(thread, currentUserName = '') {
  if (!thread || !Array.isArray(thread.messages) || thread.messages.length === 0) {
    return null;
  }

  const messages = thread.messages;

  // Identify primary senders
  const sendersMap = new Map();
  for (const m of messages) {
    if (m.sender) {
      sendersMap.set(m.sender, (sendersMap.get(m.sender) || 0) + 1);
    }
  }

  const sendersList = Array.from(sendersMap.entries()).sort((a, b) => b[1] - a[1]);
  const primarySender = sendersList[0] ? sendersList[0][0] : 'Me';
  const secondarySender = sendersList[1] ? sendersList[1][0] : (thread.title || 'Partner');

  let meName = currentUserName || primarySender;
  let partnerName = secondarySender;

  if (currentUserName && sendersMap.has(currentUserName)) {
    meName = currentUserName;
    partnerName = sendersList.find(([name]) => name !== meName)?.[0] || 'Partner';
  }

  let meCount = 0;
  let partnerCount = 0;

  const hourlyCounts = new Array(24).fill(0);
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // 0=Sun, 1=Mon, ..., 6=Sat
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const meResponseTimes = [];
  const partnerResponseTimes = [];

  const emojiCountsMe = new Map();
  const emojiCountsPartner = new Map();
  const wordCounts = new Map();

  const stopWords = new Set([
    'the','and','to','a','of','i','is','in','it','you','that','was','for','on','are','with','as','its','it\'s',
    'this','be','at','have','by','from','or','an','my','we','all','your','me','so','if','out','not','no','but',
    'what','who','when','where','how','why','can','will','just','like','up','do','dont','don\'t','get','go','about',
    'has','had','been','would','could','should','more','one','time','some','them','they','see','think','know',
    'well','im','i\'m','good','much','ok','okay','yeah','yes','haha','hahaha','lol','ur','k','n','b','bro','dm'
  ]);

  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu;

  const uniqueDays = new Set();
  let prevMsg = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isMe = msg && msg.sender ? (msg.sender === meName || (currentUserName && msg.sender.toLowerCase() === currentUserName.toLowerCase())) : false;

    if (isMe) meCount++;
    else partnerCount++;

    if (msg.timestamp > 0) {
      const d = new Date(msg.timestamp);
      const hour = d.getHours();
      const dayIndex = d.getDay();

      hourlyCounts[hour]++;
      dayCounts[dayIndex]++;

      const dateStr = d.toISOString().split('T')[0];
      uniqueDays.add(dateStr);

      // Response times (between alternate senders)
      if (prevMsg && prevMsg.timestamp > 0 && prevMsg.sender !== msg.sender) {
        const diffMs = msg.timestamp - prevMsg.timestamp;
        if (diffMs >= 3000 && diffMs <= 12 * 3600 * 1000) {
          const diffSec = diffMs / 1000;
          if (isMe) meResponseTimes.push(diffSec);
          else partnerResponseTimes.push(diffSec);
        }
      }
      prevMsg = msg;
    }

    // Emojis & Word Frequencies
    if (msg.content) {
      const text = msg.content;

      // Emojis
      const emojis = text.match(emojiRegex);
      if (emojis) {
        const targetMap = isMe ? emojiCountsMe : emojiCountsPartner;
        for (const e of emojis) {
          targetMap.set(e, (targetMap.get(e) || 0) + 1);
        }
      }

      // Keywords
      const cleanWords = text.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
      for (const w of cleanWords) {
        if (w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w)) {
          wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
        }
      }
    }
  }

  const totalMsgs = messages.length;
  const mePct = Math.round((meCount / totalMsgs) * 100) || 50;
  const partnerPct = 100 - mePct;

  const avgSecMe = meResponseTimes.length > 0 ? (meResponseTimes.reduce((a, b) => a + b, 0) / meResponseTimes.length) : 0;
  const avgSecPartner = partnerResponseTimes.length > 0 ? (partnerResponseTimes.reduce((a, b) => a + b, 0) / partnerResponseTimes.length) : 0;

  function formatSec(sec) {
    if (!sec || sec === 0) return 'N/A';
    if (sec < 60) return `${Math.round(sec)}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
    return `${(sec / 3600).toFixed(1)}h`;
  }

  // Peak Hour
  let maxHourIdx = 0;
  for (let h = 0; h < 24; h++) {
    if (hourlyCounts[h] > hourlyCounts[maxHourIdx]) maxHourIdx = h;
  }
  const peakHourStr = `${maxHourIdx}:00 - ${(maxHourIdx + 1) % 24}:00`;

  // Peak Day
  let maxDayIdx = 0;
  for (let d = 0; d < 7; d++) {
    if (dayCounts[d] > dayCounts[maxDayIdx]) maxDayIdx = d;
  }
  const peakDayStr = dayNames[maxDayIdx];

  // Top Emojis
  const topEmojisMe = Array.from(emojiCountsMe.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topEmojisPartner = Array.from(emojiCountsPartner.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const allEmojisMap = new Map();
  for (const [e, c] of emojiCountsMe) allEmojisMap.set(e, (allEmojisMap.get(e) || 0) + c);
  for (const [e, c] of emojiCountsPartner) allEmojisMap.set(e, (allEmojisMap.get(e) || 0) + c);
  const topEmojisCombined = Array.from(allEmojisMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Top Keywords
  const topKeywords = Array.from(wordCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Streaks
  const sortedDates = Array.from(uniqueDays).sort();
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDateObj = null;

  for (const dStr of sortedDates) {
    const dObj = new Date(dStr);
    if (!lastDateObj) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round((dObj - lastDateObj) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak;
    lastDateObj = dObj;
  }

  // Detailed Date & Length Analytics
  const firstMsg = messages[0];
  const lastMsg = messages[messages.length - 1];

  const firstMsgDate = firstMsg && firstMsg.timestamp > 0 
    ? new Date(firstMsg.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';
  const firstMsgTime = firstMsg && firstMsg.timestamp > 0 
    ? new Date(firstMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const lastMsgDate = lastMsg && lastMsg.timestamp > 0
    ? new Date(lastMsg.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';
  const lastMsgTime = lastMsg && lastMsg.timestamp > 0
    ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const dateCountsMap = new Map();
  let totalCharsMe = 0, totalCharsPartner = 0;
  let totalWordsMe = 0, totalWordsPartner = 0;
  let textMsgsMe = 0, textMsgsPartner = 0;

  let lateNightCountMe = 0, lateNightCountPartner = 0;
  let initiationsMe = 0, initiationsPartner = 0;

  let reelsMe = 0, reelsPartner = 0;
  let photosMe = 0, photosPartner = 0;
  let audioMe = 0, audioPartner = 0;

  const reactionsMeMap = new Map();
  const reactionsPartnerMap = new Map();

  let laughterMe = 0, laughterPartner = 0;
  let doubleTextingMe = 0, doubleTextingPartner = 0;
  let questionsMe = 0, questionsPartner = 0;

  const starterMapMe = new Map();
  const starterMapPartner = new Map();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isMe = msg && msg.sender ? (msg.sender === meName || (currentUserName && msg.sender.toLowerCase() === currentUserName.toLowerCase())) : false;

    if (i > 0 && messages[i - 1].sender === msg.sender) {
      if (isMe) doubleTextingMe++;
      else doubleTextingPartner++;
    }

    const formattedDate = msg.formattedDate || (msg.timestamp > 0 ? new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown');
    const dateKey = formattedDate;

    if (msg.timestamp > 0) {
      const d = new Date(msg.timestamp);
      const hour = d.getHours();

      if (!dateCountsMap.has(dateKey)) {
        dateCountsMap.set(dateKey, { count: 1, firstMsgId: msg.id, formattedDate });
      } else {
        const item = dateCountsMap.get(dateKey);
        item.count++;
      }

      // Late night chatter (12 AM - 6 AM)
      if (hour >= 0 && hour < 6) {
        if (isMe) lateNightCountMe++;
        else lateNightCountPartner++;
      }

      // Conversation initiation (gap > 4 hrs)
      const isInitiation = i === 0 || (messages[i - 1] && messages[i - 1].timestamp > 0 && (msg.timestamp - messages[i - 1].timestamp) > 4 * 3600 * 1000);
      if (isInitiation) {
        if (isMe) initiationsMe++;
        else initiationsPartner++;

        if (msg.content && msg.content.trim()) {
          const firstWord = msg.content.trim().split(/\s+/)[0].toLowerCase().replace(/[^\w]/g, '');
          if (firstWord && firstWord.length >= 2 && !stopWords.has(firstWord)) {
            const targetMap = isMe ? starterMapMe : starterMapPartner;
            targetMap.set(firstWord, (targetMap.get(firstWord) || 0) + 1);
          }
        }
      }
    }

    // Message Length & Sentiment Stats
    if (msg.content && msg.content.trim()) {
      const charLen = msg.content.length;
      const wordCount = msg.content.trim().split(/\s+/).filter(Boolean).length;
      const lower = msg.content.toLowerCase();

      if (msg.content.includes('?')) {
        if (isMe) questionsMe++;
        else questionsPartner++;
      }

      // Check laughter / high energy
      const isLaughter = /haha|hahaha|lol|lmao|rofl|hehe/i.test(lower) || (msg.content.includes('!') && charLen > 10);
      if (isLaughter) {
        if (isMe) laughterMe++; else laughterPartner++;
      }

      if (isMe) {
        totalCharsMe += charLen;
        totalWordsMe += wordCount;
        textMsgsMe++;
      } else {
        totalCharsPartner += charLen;
        totalWordsPartner += wordCount;
        textMsgsPartner++;
      }
    }

    // Media shares per user
    if (isReelMessage(msg)) {
      if (isMe) reelsMe++; else reelsPartner++;
    }
    if (msg.photos && msg.photos.length > 0) {
      if (isMe) photosMe += msg.photos.length; else photosPartner += msg.photos.length;
    }
    if (msg.audioFiles && msg.audioFiles.length > 0) {
      if (isMe) audioMe += msg.audioFiles.length; else audioPartner += msg.audioFiles.length;
    }

    // Track reactions by sender actor
    if (Array.isArray(msg.reactions)) {
      for (const r of msg.reactions) {
        const actorName = r.actor || '';
        const isMeActor = actorName ? (actorName === meName || (currentUserName && actorName.toLowerCase() === currentUserName.toLowerCase())) : false;
        const emoji = r.reaction || '❤️';
        const targetMap = isMeActor ? reactionsMeMap : reactionsPartnerMap;
        targetMap.set(emoji, (targetMap.get(emoji) || 0) + 1);
      }
    }
  }

  // Peak calendar date
  let peakDateStr = 'Unknown';
  let peakDateCount = 0;
  let peakDateMsgId = firstMsg ? firstMsg.id : null;

  for (const [key, item] of dateCountsMap.entries()) {
    if (item.count > peakDateCount) {
      peakDateCount = item.count;
      peakDateStr = item.formattedDate;
      peakDateMsgId = item.firstMsgId;
    }
  }

  // Top reactions
  const topReactionsMe = Array.from(reactionsMeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topReactionsPartner = Array.from(reactionsPartnerMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Top Starter Words
  const topStartersMe = Array.from(starterMapMe.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topStartersPartner = Array.from(starterMapPartner.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Dynamic Personality Badges
  const badges = [];
  const lateNightTotal = lateNightCountMe + lateNightCountPartner;
  if (totalMsgs > 0 && (lateNightTotal / totalMsgs) > 0.12) {
    badges.push({ icon: '🦉', title: 'Night Owls', desc: `${Math.round((lateNightTotal / totalMsgs) * 100)}% of messages sent past midnight` });
  }
  if (reelsMe + reelsPartner >= 5) {
    badges.push({ icon: '🎬', title: 'Reels Lovers', desc: `${reelsMe + reelsPartner} shared reels in this chat` });
  }
  if (avgSecMe > 0 && avgSecMe < 300) {
    badges.push({ icon: '⚡', title: `${meName} Speed Replier`, desc: 'Replies in under 5 minutes on average' });
  }
  if (avgSecPartner > 0 && avgSecPartner < 300) {
    badges.push({ icon: '⚡', title: `${partnerName} Speed Replier`, desc: 'Replies in under 5 minutes on average' });
  }
  if (maxStreak >= 4) {
    badges.push({ icon: '🔥', title: `${maxStreak}-Day Streak`, desc: 'Unbroken consecutive chat streak record' });
  }
  if (audioMe + audioPartner >= 3) {
    badges.push({ icon: '🎙️', title: 'Voice Note Fans', desc: `${audioMe + audioPartner} voice notes exchanged` });
  }
  if (avgWordsMe > 12 || avgWordsPartner > 12) {
    badges.push({ icon: '📜', title: 'Deep Storytellers', desc: 'Sends rich & expressive messages' });
  }
  if (badges.length === 0) {
    badges.push({ icon: '✨', title: 'Vibrant Dynamic Duo', desc: 'Active & engaged chat partners' });
  }

  // Averages
  const avgCharsMe = textMsgsMe > 0 ? Math.round(totalCharsMe / textMsgsMe) : 0;
  const avgWordsMe = textMsgsMe > 0 ? Math.round((totalWordsMe / textMsgsMe) * 10) / 10 : 0;

  const avgCharsPartner = textMsgsPartner > 0 ? Math.round(totalCharsPartner / textMsgsPartner) : 0;
  const avgWordsPartner = textMsgsPartner > 0 ? Math.round((totalWordsPartner / textMsgsPartner) * 10) / 10 : 0;

  return {
    totalMsgs,
    meName,
    partnerName,
    meCount,
    partnerCount,
    mePct,
    partnerPct,
    avgResponseTimeMe: formatSec(avgSecMe),
    avgResponseTimePartner: formatSec(avgSecPartner),
    hourlyCounts,
    peakHourStr,
    dayCounts,
    dayNames,
    peakDayStr,
    topEmojisCombined,
    topEmojisMe,
    topEmojisPartner,
    topKeywords,
    uniqueActiveDays: sortedDates.length,
    maxStreakDays: maxStreak,
    // New analytics fields
    firstMsgDate,
    firstMsgTime,
    firstMsgId: firstMsg ? firstMsg.id : null,
    firstMsgSender: firstMsg ? firstMsg.sender : '',
    lastMsgDate,
    lastMsgTime,
    lastMsgId: lastMsg ? lastMsg.id : null,
    lastMsgSender: lastMsg ? lastMsg.sender : '',
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
    photosPartner,
    audioMe,
    audioPartner,
    topReactionsMe,
    topReactionsPartner,
    laughterMe,
    laughterPartner,
    doubleTextingMe,
    doubleTextingPartner,
    questionsMe,
    questionsPartner,
    topStartersMe,
    topStartersPartner,
    badges
  };
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
