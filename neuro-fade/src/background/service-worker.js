/**
 * Neuro-Fade Service Worker (Background Script)
 * Manages session state, badge updates, and message routing
 */

const STORAGE_KEYS = {
    ENABLED: 'nf_enabled',
    SENSITIVITY: 'nf_sensitivity',
    SESSIONS: 'nf_sessions',
    TOTAL_INTERVENTIONS: 'nf_total_interventions',
    TOTAL_TIME_SAVED: 'nf_total_time_saved'
};

const MESSAGES = {
    GET_STATE: 'nf_get_state',
    UPDATE_SCORE: 'nf_update_score',
    TOGGLE: 'nf_toggle',
    OPEN_DASHBOARD: 'nf_open_dashboard',
    SESSION_UPDATE: 'nf_session_update'
};

// Current state per tab
const tabStates = new Map();

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (msg.type) {
        case MESSAGES.UPDATE_SCORE:
            if (tabId) {
                tabStates.set(tabId, {
                    score: msg.data.score,
                    effects: msg.data.effects,
                    detector: msg.data.detector,
                    timestamp: Date.now()
                });
                updateBadge(tabId, msg.data.score);
                trackSession(tabId, msg.data);
            }
            break;

        case MESSAGES.OPEN_DASHBOARD:
            chrome.tabs.create({
                url: chrome.runtime.getURL('src/dashboard/dashboard.html')
            });
            sendResponse({ ok: true });
            return true;

        case 'nf_get_tab_state':
            if (msg.tabId && tabStates.has(msg.tabId)) {
                sendResponse(tabStates.get(msg.tabId));
            } else {
                sendResponse(null);
            }
            return true;
    }
});

/**
 * Update extension badge with dopamine score
 */
function updateBadge(tabId, score) {
    const text = score > 10 ? String(Math.round(score)) : '';

    let color;
    if (score < 25) color = '#22c55e';
    else if (score < 45) color = '#eab308';
    else if (score < 65) color = '#f97316';
    else color = '#ef4444';

    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
}

/**
 * Track session data for the dashboard
 */
async function trackSession(tabId, data) {
    if (data.score < 25) return; // Only track when significant

    try {
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.SESSIONS,
            STORAGE_KEYS.TOTAL_INTERVENTIONS
        ]);

        const sessions = result[STORAGE_KEYS.SESSIONS] || [];
        const interventions = result[STORAGE_KEYS.TOTAL_INTERVENTIONS] || 0;

        // Add or update session entry
        const lastSession = sessions[sessions.length - 1];
        const now = Date.now();

        if (lastSession && now - lastSession.timestamp < 60000 && lastSession.tabId === tabId) {
            // Update existing session
            lastSession.peakScore = Math.max(lastSession.peakScore, data.score);
            lastSession.duration = now - lastSession.startTime;
            lastSession.timestamp = now;
        } else {
            // New session
            sessions.push({
                tabId,
                platform: data.detector?.platform || 'Unknown',
                startTime: now,
                timestamp: now,
                duration: 0,
                peakScore: data.score,
                score: data.score
            });
        }

        // Keep last 100 sessions
        while (sessions.length > 100) sessions.shift();

        await chrome.storage.local.set({
            [STORAGE_KEYS.SESSIONS]: sessions,
            [STORAGE_KEYS.TOTAL_INTERVENTIONS]: interventions + 1
        });
    } catch (e) {
        // Storage error
    }
}

/**
 * Clean up tab state when tab closes
 */
chrome.tabs.onRemoved.addListener((tabId) => {
    tabStates.delete(tabId);
});

/**
 * Initialize default settings
 */
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        [STORAGE_KEYS.ENABLED]: true,
        [STORAGE_KEYS.SENSITIVITY]: 0.5,
        [STORAGE_KEYS.SESSIONS]: [],
        [STORAGE_KEYS.TOTAL_INTERVENTIONS]: 0,
        [STORAGE_KEYS.TOTAL_TIME_SAVED]: 0
    });
});
