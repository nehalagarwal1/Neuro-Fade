/**
 * Neuro-Fade Main Content Script
 * Entry point — wires up detector, effects, and messaging
 */

(function () {
    'use strict';

    const C = window.NEURO_FADE_CONSTANTS;
    let detector = null;
    let fadeEngine = null;
    let indicator = null;
    let enabled = true;

    /**
     * Initialize Neuro-Fade
     */
    async function init() {
        // Check if enabled in storage
        try {
            const result = await chrome.storage.local.get([
                C.STORAGE_KEYS.ENABLED,
                C.STORAGE_KEYS.SENSITIVITY
            ]);
            enabled = result[C.STORAGE_KEYS.ENABLED] !== false; // Default true
            const sensitivity = result[C.STORAGE_KEYS.SENSITIVITY] ?? 0.5;

            if (!enabled) return;

            // Create detector and engine
            detector = new window.NeuroFadeDetector();
            fadeEngine = new window.FadeEngine();

            detector.sensitivity = sensitivity;

            // Wire up video detection
            detector.onVideoDetected = (video) => {
                fadeEngine.registerVideo(video);
            };

            // Wire up score updates
            detector.onScoreUpdate = (score, details) => {
                fadeEngine.update(score);
                updateIndicator(score);
                sendStateUpdate(score, details);
            };

            // Create on-page indicator
            createIndicator();

            // Start!
            detector.start();

            // Wait minimum time before analysis
            setTimeout(() => {
                console.log('[Neuro-Fade] Analysis active on', detector.platform?.name);
            }, C.TIMING.MIN_WATCH_TIME);

        } catch (e) {
            console.debug('[Neuro-Fade] Init error:', e);
        }
    }

    /**
     * Create the on-page indicator dot
     */
    function createIndicator() {
        indicator = document.createElement('div');
        indicator.className = 'neuro-fade-indicator low';
        indicator.dataset.tooltip = 'Neuro-Fade: Monitoring';
        indicator.title = '';
        document.body.appendChild(indicator);

        // Click to toggle
        indicator.addEventListener('click', () => {
            if (detector) {
                enabled = !enabled;
                detector.enabled = enabled;
                if (!enabled) {
                    fadeEngine.reset();
                    indicator.className = 'neuro-fade-indicator';
                    indicator.style.opacity = '0.3';
                    indicator.dataset.tooltip = 'Neuro-Fade: Paused';
                } else {
                    indicator.style.opacity = '';
                    indicator.dataset.tooltip = 'Neuro-Fade: Monitoring';
                }
                chrome.storage.local.set({ [C.STORAGE_KEYS.ENABLED]: enabled });
            }
        });
    }

    /**
     * Update indicator based on dopamine score
     */
    function updateIndicator(score) {
        if (!indicator) return;
        const T = C.THRESHOLDS;
        let level, label;

        if (score < T.LOW) {
            level = 'low';
            label = `Neuro-Fade: Calm (${Math.round(score)})`;
        } else if (score < T.MODERATE) {
            level = 'moderate';
            label = `Neuro-Fade: Moderate (${Math.round(score)})`;
        } else if (score < T.HIGH) {
            level = 'high';
            label = `Neuro-Fade: High — Fading... (${Math.round(score)})`;
        } else {
            level = 'critical';
            label = `Neuro-Fade: Critical — Active (${Math.round(score)})`;
        }

        indicator.className = `neuro-fade-indicator ${level}`;
        indicator.dataset.tooltip = label;
    }

    /**
     * Send state updates to background/popup
     */
    function sendStateUpdate(score, details) {
        try {
            chrome.runtime.sendMessage({
                type: C.MESSAGES.UPDATE_SCORE,
                data: {
                    score: Math.round(score),
                    effects: fadeEngine.getState(),
                    detector: detector.getState(),
                    details
                }
            });
        } catch (e) {
            // Extension context invalidated
        }
    }

    /**
     * Handle messages from popup/background
     */
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        switch (msg.type) {
            case C.MESSAGES.GET_STATE:
                sendResponse({
                    score: detector ? Math.round(detector.dopamineScore) : 0,
                    effects: fadeEngine ? fadeEngine.getState() : {},
                    detector: detector ? detector.getState() : {},
                    enabled
                });
                return true;

            case C.MESSAGES.TOGGLE:
                enabled = !enabled;
                if (detector) detector.enabled = enabled;
                if (!enabled && fadeEngine) fadeEngine.reset();
                if (indicator) {
                    if (enabled) {
                        indicator.style.opacity = '';
                        indicator.dataset.tooltip = 'Neuro-Fade: Monitoring';
                    } else {
                        indicator.style.opacity = '0.3';
                        indicator.dataset.tooltip = 'Neuro-Fade: Paused';
                    }
                }
                chrome.storage.local.set({ [C.STORAGE_KEYS.ENABLED]: enabled });
                sendResponse({ enabled });
                return true;

            case C.MESSAGES.SET_SENSITIVITY:
                if (detector) {
                    detector.sensitivity = msg.value;
                    chrome.storage.local.set({ [C.STORAGE_KEYS.SENSITIVITY]: msg.value });
                }
                sendResponse({ sensitivity: msg.value });
                return true;

            case C.MESSAGES.BREATHE:
                if (fadeEngine) fadeEngine.breathe();
                sendResponse({ ok: true });
                return true;
        }
    });

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
