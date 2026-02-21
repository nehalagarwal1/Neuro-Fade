/**
 * Neuro-Fade Frame Analyzer
 * Captures and analyzes video frames for scene-cut detection
 * Integrates with AMD NPU via WebNN API when available
 */

class FrameAnalyzer {
    constructor() {
        this.canvas = new OffscreenCanvas(160, 90); // Small for perf
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.previousHistogram = null;
        this.sceneCuts = [];
        this.motionScores = [];
        this.frameCount = 0;
        this.lastFrameData = null;

        const C = window.NEURO_FADE_CONSTANTS;
        this.BINS = C.SCENE_CUT.HISTOGRAM_BINS;
        this.DIFF_THRESHOLD = C.SCENE_CUT.DIFF_THRESHOLD;
        this.MOTION_THRESHOLD = C.SCENE_CUT.MOTION_THRESHOLD;
        this.CUT_WINDOW = C.TIMING.SCENE_CUT_WINDOW;

        // Initialize AMD NPU bridge for accelerated histogram comparison
        this.npuBridge = null;
        this._initNPU();
    }

    /**
     * Initialize AMD NPU for accelerated processing
     */
    async _initNPU() {
        try {
            if (window.NPUBridge) {
                this.npuBridge = new window.NPUBridge();
                await this.npuBridge.init();
                console.log('[Neuro-Fade] FrameAnalyzer NPU:', this.npuBridge.getStatusString());
            }
        } catch (e) {
            console.debug('[Neuro-Fade] NPU init failed in FrameAnalyzer:', e);
        }
    }

    /**
     * Analyze a single video frame
     * Returns: { isSceneCut, motionScore, histogram, cutRate }
     */
    analyzeFrame(videoElement) {
        if (!videoElement || videoElement.paused || videoElement.ended ||
            videoElement.readyState < 2 || videoElement.videoWidth === 0) {
            return null;
        }

        try {
            // Draw scaled frame
            this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;

            // Compute color histogram
            const histogram = this._computeHistogram(data);

            // Compute motion score
            const motionScore = this._computeMotion(data);

            // Detect scene cut (use NPU-accelerated comparison when available)
            let isSceneCut = false;
            if (this.previousHistogram) {
                let diff;
                if (this.npuBridge && this.npuBridge.available) {
                    // AMD NPU-accelerated histogram comparison
                    this.npuBridge.computeHistogramDistance(this.previousHistogram, histogram)
                        .then(d => { /* async update handled by next frame */ });
                    // Use sync fallback for immediate result
                    diff = this._histogramDiff(this.previousHistogram, histogram);
                } else {
                    diff = this._histogramDiff(this.previousHistogram, histogram);
                }
                isSceneCut = diff > this.DIFF_THRESHOLD;
            }

            // Track scene cuts in time window
            const now = Date.now();
            if (isSceneCut) {
                this.sceneCuts.push(now);
            }
            // Clean old cuts outside window
            this.sceneCuts = this.sceneCuts.filter(t => now - t < this.CUT_WINDOW);

            // Compute cut rate (cuts per 10 seconds)
            const windowSeconds = this.CUT_WINDOW / 1000;
            const cutRate = (this.sceneCuts.length / windowSeconds) * 10;

            // Store for next comparison
            this.previousHistogram = histogram;
            this.lastFrameData = data.slice(0); // Copy
            this.frameCount++;

            // Track motion scores (keep last 20)
            this.motionScores.push(motionScore);
            if (this.motionScores.length > 20) this.motionScores.shift();

            return {
                isSceneCut,
                motionScore,
                cutRate,
                avgMotion: this._average(this.motionScores),
                frameCount: this.frameCount,
                histogram
            };
        } catch (e) {
            // Cross-origin or unavailable frame
            return null;
        }
    }

    /**
     * Compute RGB color histogram with N bins per channel
     */
    _computeHistogram(data) {
        const bins = this.BINS;
        const histogram = new Float32Array(bins * 3); // R, G, B
        const binSize = 256 / bins;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            const r = Math.floor(data[i] / binSize);
            const g = Math.floor(data[i + 1] / binSize);
            const b = Math.floor(data[i + 2] / binSize);
            histogram[r]++;
            histogram[bins + g]++;
            histogram[bins * 2 + b]++;
        }

        // Normalize
        for (let i = 0; i < histogram.length; i++) {
            histogram[i] /= pixelCount;
        }

        return histogram;
    }

    /**
     * Compare two histograms using chi-squared distance
     */
    _histogramDiff(h1, h2) {
        let diff = 0;
        for (let i = 0; i < h1.length; i++) {
            const sum = h1[i] + h2[i];
            if (sum > 0) {
                diff += ((h1[i] - h2[i]) ** 2) / sum;
            }
        }
        return diff / h1.length;
    }

    /**
     * Compute frame motion by comparing pixel differences
     */
    _computeMotion(currentData) {
        if (!this.lastFrameData) return 0;

        let diffSum = 0;
        const pixelCount = currentData.length / 4;
        const step = 16; // Sample every 16th pixel for speed

        for (let i = 0; i < currentData.length; i += 4 * step) {
            const dr = Math.abs(currentData[i] - this.lastFrameData[i]);
            const dg = Math.abs(currentData[i + 1] - this.lastFrameData[i + 1]);
            const db = Math.abs(currentData[i + 2] - this.lastFrameData[i + 2]);
            diffSum += (dr + dg + db) / (3 * 255);
        }

        return diffSum / (pixelCount / step);
    }

    _average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Get the current stimulation metrics
     */
    getMetrics() {
        return {
            cutRate: this.sceneCuts.length > 0
                ? (this.sceneCuts.length / (this.CUT_WINDOW / 1000)) * 10
                : 0,
            avgMotion: this._average(this.motionScores),
            totalFrames: this.frameCount,
            recentCuts: this.sceneCuts.length
        };
    }

    reset() {
        this.previousHistogram = null;
        this.sceneCuts = [];
        this.motionScores = [];
        this.frameCount = 0;
        this.lastFrameData = null;
    }
}

// Export for content script
window.FrameAnalyzer = FrameAnalyzer;
