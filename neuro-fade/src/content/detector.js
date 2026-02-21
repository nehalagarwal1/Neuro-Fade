/**
 * Neuro-Fade Detector
 * Monitors video playback and scroll behavior to compute a "dopamine score"
 */

class NeuroFadeDetector {
    constructor() {
        const C = window.NEURO_FADE_CONSTANTS;
        this.C = C;
        this.platform = this._detectPlatform();
        this.frameAnalyzer = new window.FrameAnalyzer();

        // State
        this.enabled = true;
        this.sensitivity = 0.5; // 0-1
        this.dopamineScore = 0;
        this.isActive = false;
        this.startTime = Date.now();
        this.videos = new Set();

        // Scroll tracking
        this.scrollEvents = [];
        this.lastScrollY = window.scrollY;
        this.lastScrollTime = Date.now();
        this.domHeightChanges = [];
        this.lastDOMHeight = document.body.scrollHeight;

        // Intervals
        this._intervals = [];
        this._observers = [];

        // Callbacks
        this.onScoreUpdate = null;
        this.onVideoDetected = null;
    }

    /**
     * Start monitoring
     */
    start() {
        if (!this.platform) return;
        this.isActive = true;
        this.startTime = Date.now();

        // Observe DOM for video elements
        this._observeVideos();

        // Find existing videos
        this._findVideos();

        // Start scroll monitoring
        this._startScrollMonitoring();

        // Start periodic score calculation
        const scoreInterval = setInterval(() => {
            if (this.enabled) this._updateDopamineScore();
        }, this.C.TIMING.SCORE_UPDATE_INTERVAL);
        this._intervals.push(scoreInterval);

        // Start frame analysis on active videos
        const frameInterval = setInterval(() => {
            if (this.enabled) this._analyzeActiveVideo();
        }, this.C.TIMING.FRAME_SAMPLE_INTERVAL);
        this._intervals.push(frameInterval);

        // Monitor DOM height changes (infinite scroll detection)
        const domInterval = setInterval(() => {
            const currentHeight = document.body.scrollHeight;
            if (currentHeight !== this.lastDOMHeight) {
                this.domHeightChanges.push(Date.now());
                this.lastDOMHeight = currentHeight;
                // Clean old
                const now = Date.now();
                this.domHeightChanges = this.domHeightChanges.filter(
                    t => now - t < this.C.SCROLL.RAPID_SCROLL_WINDOW
                );
            }
        }, 500);
        this._intervals.push(domInterval);
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isActive = false;
        this._intervals.forEach(id => clearInterval(id));
        this._intervals = [];
        this._observers.forEach(obs => obs.disconnect());
        this._observers = [];
        window.removeEventListener('scroll', this._scrollHandler);
    }

    /**
     * Detect current platform
     */
    _detectPlatform() {
        const host = window.location.hostname.replace('www.', '');
        for (const [domain, config] of Object.entries(this.C.PLATFORMS)) {
            if (host.includes(domain)) return config;
        }
        return null;
    }

    /**
     * Observe DOM for new video elements
     */
    _observeVideos() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.tagName === 'VIDEO') {
                        this._registerVideo(node);
                    }
                    // Check children
                    const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
                    videos.forEach(v => this._registerVideo(v));
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        this._observers.push(observer);
    }

    /**
     * Find existing video elements
     */
    _findVideos() {
        const selector = this.platform.videoSelector || 'video';
        document.querySelectorAll(selector).forEach(v => this._registerVideo(v));
    }

    /**
     * Register a video for monitoring
     */
    _registerVideo(video) {
        if (this.videos.has(video)) return;
        this.videos.add(video);
        if (this.onVideoDetected) this.onVideoDetected(video);
    }

    /**
     * Get the most visible/active video
     */
    _getActiveVideo() {
        let bestVideo = null;
        let bestArea = 0;

        for (const video of this.videos) {
            if (video.paused || video.ended || !video.offsetParent) continue;
            const rect = video.getBoundingClientRect();
            const visibleArea = Math.max(0,
                Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
            ) * Math.max(0,
                Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
            );
            if (visibleArea > bestArea) {
                bestArea = visibleArea;
                bestVideo = video;
            }
        }
        return bestVideo;
    }

    /**
     * Analyze the currently active video frame
     */
    _analyzeActiveVideo() {
        const video = this._getActiveVideo();
        if (!video) return;
        this.frameAnalyzer.analyzeFrame(video);
    }

    /**
     * Start scroll monitoring
     */
    _startScrollMonitoring() {
        this._scrollHandler = () => {
            const now = Date.now();
            const dy = Math.abs(window.scrollY - this.lastScrollY);
            const dt = (now - this.lastScrollTime) / 1000 || 0.001;
            const velocity = dy / dt;

            this.scrollEvents.push({ time: now, velocity, dy });

            // Clean old events
            this.scrollEvents = this.scrollEvents.filter(
                e => now - e.time < this.C.SCROLL.RAPID_SCROLL_WINDOW
            );

            this.lastScrollY = window.scrollY;
            this.lastScrollTime = now;
        };

        window.addEventListener('scroll', this._scrollHandler, { passive: true });
    }

    /**
     * Calculate the composite dopamine score (0-100)
     */
    _updateDopamineScore() {
        const W = this.C.SCORE_WEIGHTS;
        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000; // seconds

        // 1. Scene-cut score (from frame analyzer)
        const metrics = this.frameAnalyzer.getMetrics();
        const cutRateNorm = Math.min(metrics.cutRate / this.C.SCENE_CUT.HIGH_CUT_RATE, 1);
        const motionNorm = Math.min(metrics.avgMotion / this.C.SCENE_CUT.MOTION_THRESHOLD, 1);
        const sceneCutScore = (cutRateNorm * 0.7 + motionNorm * 0.3) * 100;

        // 2. Scroll velocity score
        const fastScrolls = this.scrollEvents.filter(
            e => e.velocity > this.C.SCROLL.VELOCITY_THRESHOLD
        ).length;
        const scrollScore = Math.min(
            fastScrolls / this.C.SCROLL.RAPID_SCROLL_COUNT, 1
        ) * 100;

        // 3. Time-on-page score (logarithmic increase)
        const timeScore = Math.min(Math.log10(1 + elapsed / 60) * 50, 100);

        // 4. Content changes (infinite scroll detection)
        const contentChangeScore = Math.min(
            this.domHeightChanges.length / this.C.SCROLL.INFINITE_SCROLL_THRESHOLD, 1
        ) * 100;

        // 5. Active video count
        let activeVideos = 0;
        for (const v of this.videos) {
            if (!v.paused && !v.ended) activeVideos++;
        }
        const videoScore = Math.min(activeVideos / 3, 1) * 100;

        // Weighted composite
        let rawScore = (
            sceneCutScore * W.SCENE_CUTS +
            scrollScore * W.SCROLL_VELOCITY +
            timeScore * W.TIME_ON_PAGE +
            contentChangeScore * W.CONTENT_CHANGES +
            videoScore * W.VIDEO_COUNT
        );

        // Apply sensitivity multiplier (0.5 sensitivity = 1x, 1.0 = 2x)
        rawScore *= (0.5 + this.sensitivity * 1.5);

        // Smooth transition (EMA)
        const alpha = 0.15;
        this.dopamineScore = alpha * Math.min(rawScore, 100) + (1 - alpha) * this.dopamineScore;

        // Notify
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.dopamineScore, {
                sceneCutScore,
                scrollScore,
                timeScore,
                contentChangeScore,
                videoScore,
                rawScore,
                metrics
            });
        }
    }

    /**
     * Get current state summary
     */
    getState() {
        return {
            enabled: this.enabled,
            platform: this.platform?.name || 'Unknown',
            dopamineScore: Math.round(this.dopamineScore),
            videoCount: this.videos.size,
            activeTime: Math.round((Date.now() - this.startTime) / 1000),
            sensitivity: this.sensitivity
        };
    }
}

window.NeuroFadeDetector = NeuroFadeDetector;
