/**
 * Neuro-Fade Popup Script
 * Handles popup UI interactions and real-time state display
 */

const MESSAGES = {
    GET_STATE: 'nf_get_state',
    TOGGLE: 'nf_toggle',
    SET_SENSITIVITY: 'nf_set_sensitivity',
    BREATHE: 'nf_breathe',
    UPDATE_SCORE: 'nf_update_score',
    OPEN_DASHBOARD: 'nf_open_dashboard'
};

// DOM Elements
const mainToggle = document.getElementById('mainToggle');
const scoreDisplay = document.getElementById('scoreDisplay');
const gaugeArc = document.getElementById('gaugeArc');
const gaugeGlow = document.getElementById('gaugeGlow');
const statusText = document.getElementById('statusText');
const platformLabel = document.getElementById('platformLabel');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityValue = document.getElementById('sensitivityValue');
const breatheBtn = document.getElementById('breatheBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const npuStatus = document.getElementById('npuStatus');
const grayscaleBar = document.getElementById('grayscaleBar');
const grayscaleValue = document.getElementById('grayscaleValue');
const audioBar = document.getElementById('audioBar');
const audioValue = document.getElementById('audioValue');
const speedBar = document.getElementById('speedBar');
const speedValue = document.getElementById('speedValue');

const GAUGE_TOTAL = 251.3; // Arc circumference

/**
 * Initialize popup
 */
async function init() {
    // Load stored settings
    const stored = await chrome.storage.local.get(['nf_enabled', 'nf_sensitivity']);
    mainToggle.checked = stored.nf_enabled !== false;
    sensitivitySlider.value = (stored.nf_sensitivity ?? 0.5) * 100;
    sensitivityValue.textContent = Math.round(sensitivitySlider.value) + '%';

    if (!mainToggle.checked) {
        document.querySelector('.popup-container').classList.add('disabled');
    }

    // Get current state from the active tab
    requestState();

    // Listen for real-time updates
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === MESSAGES.UPDATE_SCORE) {
            updateUI(msg.data);
        }
    });

    // Poll for updates
    setInterval(requestState, 1500);

    // Detect NPU
    detectNPU();
}

/**
 * Request current state from the content script
 */
async function requestState() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        chrome.tabs.sendMessage(tab.id, { type: MESSAGES.GET_STATE }, (response) => {
            if (chrome.runtime.lastError) {
                platformLabel.textContent = 'Not on a supported site';
                return;
            }
            if (response) updateUI(response);
        });
    } catch (e) { }
}

/**
 * Update all UI elements with current state
 */
function updateUI(data) {
    const score = data.score || 0;
    const effects = data.effects || {};
    const detector = data.detector || {};

    // Update score display
    animateNumber(scoreDisplay, score);

    // Update gauge arc
    const offset = GAUGE_TOTAL - (score / 100) * GAUGE_TOTAL;
    gaugeArc.style.strokeDashoffset = offset;
    gaugeGlow.style.strokeDashoffset = offset;

    // Platform label
    if (detector.platform) {
        platformLabel.textContent = `Monitoring ${detector.platform}`;
    }

    // Status text
    if (score < 25) {
        statusText.textContent = '✨ You\'re browsing calmly';
        statusText.style.color = '#22c55e';
    } else if (score < 45) {
        statusText.textContent = '👀 Stimulus level rising...';
        statusText.style.color = '#eab308';
    } else if (score < 65) {
        statusText.textContent = '⚡ Engaging fade effects...';
        statusText.style.color = '#f97316';
    } else {
        statusText.textContent = '🧠 Active dopamine reduction';
        statusText.style.color = '#ef4444';
    }

    // Effect bars
    const gs = Math.round((effects.grayscale || 0) * 100);
    grayscaleBar.style.width = gs + '%';
    grayscaleValue.textContent = gs + '%';

    const audio = Math.round((effects.audioIntensity || 0) * 100);
    audioBar.style.width = audio + '%';
    audioValue.textContent = audio + '%';

    const rate = effects.playbackRate || 1;
    const slowdown = Math.round((1 - rate) * 1000) / 10;
    speedBar.style.width = (slowdown / 15 * 100) + '%';
    speedValue.textContent = rate.toFixed(2) + 'x';
}

/**
 * Animate number change
 */
function animateNumber(element, target) {
    const current = parseInt(element.textContent) || 0;
    if (current === target) return;

    const diff = target - current;
    const step = Math.sign(diff) * Math.max(1, Math.abs(diff) / 10);
    let value = current;

    const animate = () => {
        value += step;
        if ((step > 0 && value >= target) || (step < 0 && value <= target)) {
            value = target;
        }
        element.textContent = Math.round(value);
        if (value !== target) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
}

/**
 * Detect AMD NPU availability
 */
async function detectNPU() {
    const dot = npuStatus.querySelector('.npu-dot');
    const label = npuStatus.querySelector('span:last-child');

    try {
        if ('ml' in navigator) {
            const context = await navigator.ml.createContext({ deviceType: 'npu' });
            if (context) {
                dot.className = 'npu-dot active';
                label.textContent = 'AMD NPU: Active ⚡';
                return;
            }
        }
    } catch (e) { }

    // Fallback check
    try {
        if ('ml' in navigator) {
            dot.className = 'npu-dot fallback';
            label.textContent = 'WebNN: GPU Fallback';
            return;
        }
    } catch (e) { }

    dot.className = 'npu-dot';
    label.textContent = 'NPU: CPU Mode';
}

// Event Listeners
mainToggle.addEventListener('change', async () => {
    const enabled = mainToggle.checked;
    const container = document.querySelector('.popup-container');

    if (enabled) {
        container.classList.remove('disabled');
    } else {
        container.classList.add('disabled');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: MESSAGES.TOGGLE });
    }
    chrome.storage.local.set({ nf_enabled: enabled });
});

sensitivitySlider.addEventListener('input', async () => {
    const value = sensitivitySlider.value / 100;
    sensitivityValue.textContent = Math.round(sensitivitySlider.value) + '%';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: MESSAGES.SET_SENSITIVITY, value });
    }
    chrome.storage.local.set({ nf_sensitivity: value });
});

breatheBtn.addEventListener('click', async () => {
    breatheBtn.style.transform = 'scale(0.95)';
    setTimeout(() => breatheBtn.style.transform = '', 200);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: MESSAGES.BREATHE });
    }
});

dashboardBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MESSAGES.OPEN_DASHBOARD });
});

// Initialize
init();
