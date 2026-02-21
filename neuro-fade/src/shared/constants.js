/**
 * Neuro-Fade Constants
 * Shared configuration across all extension components
 */

const NEURO_FADE_CONSTANTS = {
  // Supported platforms and their selectors
  PLATFORMS: {
    'youtube.com': {
      name: 'YouTube',
      videoSelector: 'video',
      scrollContainer: '#content, ytd-rich-grid-renderer, ytd-section-list-renderer',
      shortsSelector: 'ytd-reel-video-renderer video, ytd-shorts video',
      icon: '🎬'
    },
    'instagram.com': {
      name: 'Instagram',
      videoSelector: 'video',
      scrollContainer: 'main, article',
      reelsSelector: 'div[role="presentation"] video',
      icon: '📸'
    },
    'tiktok.com': {
      name: 'TikTok',
      videoSelector: 'video',
      scrollContainer: '#app, .tiktok-feed',
      icon: '🎵'
    },
    'twitter.com': {
      name: 'Twitter/X',
      videoSelector: 'video',
      scrollContainer: 'main, [data-testid="primaryColumn"]',
      icon: '🐦'
    },
    'x.com': {
      name: 'Twitter/X',
      videoSelector: 'video',
      scrollContainer: 'main, [data-testid="primaryColumn"]',
      icon: '🐦'
    },
    'reddit.com': {
      name: 'Reddit',
      videoSelector: 'video, shreddit-player video',
      scrollContainer: 'main, .ListingLayout-outerContainer',
      icon: '🤖'
    }
  },

  // Dopamine score thresholds
  THRESHOLDS: {
    LOW: 25,        // No intervention
    MODERATE: 45,   // Begin subtle fade
    HIGH: 65,       // Noticeable intervention
    CRITICAL: 85    // Full fade engagement
  },

  // Timing configuration (milliseconds)
  TIMING: {
    FRAME_SAMPLE_INTERVAL: 500,     // How often to sample video frames
    SCROLL_CHECK_INTERVAL: 200,     // How often to check scroll patterns
    SCORE_UPDATE_INTERVAL: 1000,    // How often to recalculate dopamine score
    FADE_TRANSITION_STEP: 50,       // Transition smoothness (ms per step)
    MIN_WATCH_TIME: 5000,           // Min time before analysis starts (ms)
    COOLDOWN_PERIOD: 30000,         // Cooldown after user pauses/stops
    SCENE_CUT_WINDOW: 3000          // Window for measuring scene-cut frequency
  },

  // Effect ranges
  EFFECTS: {
    GRAYSCALE: { min: 0, max: 1, step: 0.02 },
    PLAYBACK_RATE: { min: 0.85, max: 1.0, step: 0.005 },
    AUDIO_PITCH: { min: -200, max: 0, step: 5 },      // cents
    BRIGHTNESS: { min: 0.7, max: 1.0, step: 0.01 },
    SATURATION: { min: 0.2, max: 1.0, step: 0.02 },
    BLUR: { min: 0, max: 1.5, step: 0.05 }            // px
  },

  // Scene-cut detection
  SCENE_CUT: {
    HISTOGRAM_BINS: 16,
    DIFF_THRESHOLD: 0.35,       // Histogram difference threshold for a "cut"
    HIGH_CUT_RATE: 8,           // Cuts per 10 seconds = high dopamine
    MOTION_THRESHOLD: 0.25      // Frame motion threshold
  },

  // Scroll analysis
  SCROLL: {
    VELOCITY_THRESHOLD: 800,    // px/sec for "fast" scroll
    RAPID_SCROLL_COUNT: 5,      // N fast scrolls in window = doomscrolling
    RAPID_SCROLL_WINDOW: 10000, // Time window for counting fast scrolls
    INFINITE_SCROLL_THRESHOLD: 20  // DOM height changes in window = infinite scroll
  },

  // Scoring weights
  SCORE_WEIGHTS: {
    SCENE_CUTS: 0.30,
    SCROLL_VELOCITY: 0.25,
    TIME_ON_PAGE: 0.20,
    CONTENT_CHANGES: 0.15,
    VIDEO_COUNT: 0.10
  },

  // Storage keys
  STORAGE_KEYS: {
    ENABLED: 'nf_enabled',
    SENSITIVITY: 'nf_sensitivity',
    SESSIONS: 'nf_sessions',
    SITE_SETTINGS: 'nf_site_settings',
    TOTAL_INTERVENTIONS: 'nf_total_interventions',
    TOTAL_TIME_SAVED: 'nf_total_time_saved',
    NPU_ENABLED: 'nf_npu_enabled'
  },

  // Messages
  MESSAGES: {
    GET_STATE: 'nf_get_state',
    UPDATE_SCORE: 'nf_update_score',
    TOGGLE: 'nf_toggle',
    SET_SENSITIVITY: 'nf_set_sensitivity',
    BREATHE: 'nf_breathe',
    OPEN_DASHBOARD: 'nf_open_dashboard',
    SESSION_UPDATE: 'nf_session_update'
  }
};

// Make available in both content script and module contexts
if (typeof window !== 'undefined') {
  window.NEURO_FADE_CONSTANTS = NEURO_FADE_CONSTANTS;
}
if (typeof globalThis !== 'undefined') {
  globalThis.NEURO_FADE_CONSTANTS = NEURO_FADE_CONSTANTS;
}
