/**
 * Neuro-Fade Effect Engine
 * Orchestrates all visual and audio effects based on dopamine score
 */

class FadeEngine {
    constructor() {
        const C = window.NEURO_FADE_CONSTANTS;
        this.C = C;
        this.audioProcessor = new window.AudioProcessor();

        // Current effect state
        this.currentEffects = {
            grayscale: 0,
            saturation: 1,
            brightness: 1,
            blur: 0,
            playbackRate: 1,
            audioIntensity: 0
        };

        this.targetEffects = { ...this.currentEffects };
        this.animationFrame = null;
        this.isAnimating = false;
        this.videos = new Set();
        this.styleElement = null;
        this.breatheMode = false;

        this._injectStyles();
    }

    /**
     * Inject the Neuro-Fade overlay and CSS variables
     */
    _injectStyles() {
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'neuro-fade-dynamic-styles';
        this.styleElement.textContent = `
      :root {
        --nf-grayscale: 0;
        --nf-saturation: 1;
        --nf-brightness: 1;
        --nf-blur: 0px;
      }
    `;
        document.head.appendChild(this.styleElement);
    }

    /**
     * Register a video element for effect processing
     */
    registerVideo(video) {
        if (this.videos.has(video)) return;
        this.videos.add(video);
        video.classList.add('neuro-fade-video');

        // Attach audio processor
        video.addEventListener('play', () => {
            this.audioProcessor.attach(video);
        }, { once: true });

        // If already playing
        if (!video.paused) {
            this.audioProcessor.attach(video);
        }
    }

    /**
     * Update effects based on dopamine score (0-100)
     */
    update(dopamineScore) {
        const T = this.C.THRESHOLDS;
        const E = this.C.EFFECTS;

        // No effect below LOW threshold
        if (dopamineScore < T.LOW) {
            this.targetEffects = {
                grayscale: 0,
                saturation: 1,
                brightness: 1,
                blur: 0,
                playbackRate: 1,
                audioIntensity: 0
            };
        } else {
            // Calculate intensity (0-1) based on threshold ranges
            let intensity;
            if (dopamineScore < T.MODERATE) {
                intensity = (dopamineScore - T.LOW) / (T.MODERATE - T.LOW) * 0.25;
            } else if (dopamineScore < T.HIGH) {
                intensity = 0.25 + (dopamineScore - T.MODERATE) / (T.HIGH - T.MODERATE) * 0.35;
            } else if (dopamineScore < T.CRITICAL) {
                intensity = 0.60 + (dopamineScore - T.HIGH) / (T.CRITICAL - T.HIGH) * 0.25;
            } else {
                intensity = 0.85 + (dopamineScore - T.CRITICAL) / (100 - T.CRITICAL) * 0.15;
            }

            intensity = Math.min(intensity, 1);

            this.targetEffects = {
                grayscale: intensity * E.GRAYSCALE.max,
                saturation: E.SATURATION.max - intensity * (E.SATURATION.max - E.SATURATION.min),
                brightness: E.BRIGHTNESS.max - intensity * (E.BRIGHTNESS.max - E.BRIGHTNESS.min),
                blur: intensity * E.BLUR.max,
                playbackRate: E.PLAYBACK_RATE.max - intensity * (E.PLAYBACK_RATE.max - E.PLAYBACK_RATE.min),
                audioIntensity: intensity
            };
        }

        if (!this.isAnimating) this._startAnimation();
    }

    /**
     * Trigger "Breathe" mode — instant calming pulse
     */
    breathe() {
        this.breatheMode = true;
        const savedTarget = { ...this.targetEffects };

        // Instantly go to calming state
        this.targetEffects = {
            grayscale: 0.6,
            saturation: 0.4,
            brightness: 0.85,
            blur: 0.8,
            playbackRate: 0.9,
            audioIntensity: 0.5
        };

        // Add breathe overlay
        const overlay = document.createElement('div');
        overlay.className = 'neuro-fade-breathe-overlay';
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        // Return to normal after 5 seconds
        setTimeout(() => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 1500);
            this.targetEffects = savedTarget;
            this.breatheMode = false;
        }, 5000);
    }

    /**
     * Smoothly animate toward target effects
     */
    _startAnimation() {
        this.isAnimating = true;
        const step = () => {
            let stillAnimating = false;
            const lerp = 0.06; // Smooth interpolation factor

            for (const key of Object.keys(this.currentEffects)) {
                const diff = this.targetEffects[key] - this.currentEffects[key];
                if (Math.abs(diff) > 0.001) {
                    this.currentEffects[key] += diff * lerp;
                    stillAnimating = true;
                } else {
                    this.currentEffects[key] = this.targetEffects[key];
                }
            }

            this._applyEffects();

            if (stillAnimating) {
                this.animationFrame = requestAnimationFrame(step);
            } else {
                this.isAnimating = false;
            }
        };
        this.animationFrame = requestAnimationFrame(step);
    }

    /**
     * Apply current effect values to the DOM
     */
    _applyEffects() {
        const { grayscale, saturation, brightness, blur, playbackRate, audioIntensity } = this.currentEffects;

        // Update CSS variables
        const root = document.documentElement;
        root.style.setProperty('--nf-grayscale', grayscale);
        root.style.setProperty('--nf-saturation', saturation);
        root.style.setProperty('--nf-brightness', brightness);
        root.style.setProperty('--nf-blur', blur + 'px');

        // Apply to videos
        for (const video of this.videos) {
            // Visual filter on video
            video.style.filter = `
        grayscale(${grayscale})
        saturate(${saturation})
        brightness(${brightness})
        blur(${blur}px)
      `.trim();

            // Playback rate (only if video is playing)
            if (!video.paused && !video.ended) {
                const currentRate = video.playbackRate;
                const targetRate = playbackRate;
                // Only adjust if significantly different to avoid jitter
                if (Math.abs(currentRate - targetRate) > 0.01) {
                    video.playbackRate = targetRate;
                }
            }

            // Audio effects
            this.audioProcessor.applyFade(video, audioIntensity);
        }

        // Apply subtle filter to the page body (for scroll-based content)
        const bodyFilter = `
      grayscale(${grayscale * 0.3})
      saturate(${1 - (1 - saturation) * 0.3})
      brightness(${1 - (1 - brightness) * 0.3})
    `.trim();
        document.body.style.filter = bodyFilter;
        document.body.style.transition = 'filter 0.5s ease';
    }

    /**
     * Reset all effects
     */
    reset() {
        this.targetEffects = {
            grayscale: 0,
            saturation: 1,
            brightness: 1,
            blur: 0,
            playbackRate: 1,
            audioIntensity: 0
        };

        if (!this.isAnimating) this._startAnimation();

        // Reset all videos
        for (const video of this.videos) {
            video.playbackRate = 1;
            this.audioProcessor.reset(video);
        }

        document.body.style.filter = '';
    }

    /**
     * Get current effect state
     */
    getState() {
        return {
            ...this.currentEffects,
            intensity: this.currentEffects.grayscale, // Primary intensity indicator
            breatheMode: this.breatheMode,
            videoCount: this.videos.size
        };
    }

    destroy() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.reset();
        for (const video of this.videos) {
            video.style.filter = '';
            video.classList.remove('neuro-fade-video');
            this.audioProcessor.detach(video);
        }
        if (this.styleElement) this.styleElement.remove();
        document.body.style.filter = '';
    }
}

window.FadeEngine = FadeEngine;
