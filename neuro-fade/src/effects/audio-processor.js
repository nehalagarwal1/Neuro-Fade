/**
 * Neuro-Fade Audio Processor
 * Uses Web Audio API to gradually lower pitch and apply calming audio effects
 */

class AudioProcessor {
    constructor() {
        this.audioContexts = new WeakMap();
        this.activeProcessors = new WeakMap();
    }

    /**
     * Attach audio processing pipeline to a video element
     */
    attach(videoElement) {
        if (this.activeProcessors.has(videoElement)) return;

        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaElementSource(videoElement);

            // Gain node (for volume)
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;

            // Low-pass filter (to muffle high-frequency stimulation)
            const lowPassFilter = ctx.createBiquadFilter();
            lowPassFilter.type = 'lowpass';
            lowPassFilter.frequency.value = 20000; // Start at full range
            lowPassFilter.Q.value = 0.7;

            // High-shelf to reduce sharpness
            const highShelf = ctx.createBiquadFilter();
            highShelf.type = 'highshelf';
            highShelf.frequency.value = 4000;
            highShelf.gain.value = 0; // Start neutral

            // Connect pipeline: source → lowpass → highshelf → gain → destination
            source.connect(lowPassFilter);
            lowPassFilter.connect(highShelf);
            highShelf.connect(gainNode);
            gainNode.connect(ctx.destination);

            const processor = {
                context: ctx,
                source,
                gainNode,
                lowPassFilter,
                highShelf,
                currentIntensity: 0
            };

            this.audioContexts.set(videoElement, ctx);
            this.activeProcessors.set(videoElement, processor);
        } catch (e) {
            // CORS or already-attached error — silently fail
            console.debug('[Neuro-Fade] Audio attach skipped:', e.message);
        }
    }

    /**
     * Apply fade effects to audio
     * @param {HTMLVideoElement} videoElement
     * @param {number} intensity - 0 to 1 (0 = normal, 1 = maximum calming)
     */
    applyFade(videoElement, intensity) {
        const processor = this.activeProcessors.get(videoElement);
        if (!processor) return;

        const ctx = processor.context;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }

        const now = ctx.currentTime;
        const rampTime = 0.3; // Smooth 300ms transitions

        // Lower the low-pass filter cutoff (20000Hz → 2000Hz)
        const targetFreq = 20000 - (intensity * 18000);
        processor.lowPassFilter.frequency.linearRampToValueAtTime(
            Math.max(targetFreq, 2000), now + rampTime
        );

        // Reduce high-shelf gain (0 → -12dB)
        const targetShelfGain = -intensity * 12;
        processor.highShelf.gain.linearRampToValueAtTime(
            targetShelfGain, now + rampTime
        );

        // Subtle volume reduction at high intensities (1.0 → 0.85)
        const targetGain = 1.0 - (intensity * 0.15);
        processor.gainNode.gain.linearRampToValueAtTime(
            targetGain, now + rampTime
        );

        processor.currentIntensity = intensity;
    }

    /**
     * Reset all audio effects on a video
     */
    reset(videoElement) {
        this.applyFade(videoElement, 0);
    }

    /**
     * Detach from a video element
     */
    detach(videoElement) {
        const processor = this.activeProcessors.get(videoElement);
        if (processor) {
            try {
                processor.context.close();
            } catch (e) { }
            this.activeProcessors.delete(videoElement);
            this.audioContexts.delete(videoElement);
        }
    }

    /**
     * Get current audio state for a video
     */
    getState(videoElement) {
        const processor = this.activeProcessors.get(videoElement);
        return processor ? {
            intensity: processor.currentIntensity,
            active: true
        } : { intensity: 0, active: false };
    }
}

window.AudioProcessor = AudioProcessor;
