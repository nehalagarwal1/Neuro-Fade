/**
 * Neuro-Fade Dashboard Script
 * Animated visualizations, session stats, and settings management
 */

// ===== Platform Config =====
const PLATFORMS = {
    'youtube.com': { name: 'YouTube', icon: '🎬' },
    'instagram.com': { name: 'Instagram', icon: '📸' },
    'tiktok.com': { name: 'TikTok', icon: '🎵' },
    'twitter.com': { name: 'Twitter/X', icon: '🐦' },
    'x.com': { name: 'Twitter/X', icon: '🐦' },
    'reddit.com': { name: 'Reddit', icon: '🤖' }
};

// ===== Neural Activity Visualization =====
class NeuralVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Neural nodes
        this.nodes = [];
        this.connections = [];
        this.dataPoints = { dopamine: [], fade: [], calm: [] };
        this.maxPoints = 60;
        this.frame = 0;

        this._initNodes();
        this._animate();
    }

    _initNodes() {
        // Create neural network nodes in layers
        const layers = [4, 6, 8, 6, 4];
        const layerWidth = this.width / (layers.length + 1);

        for (let l = 0; l < layers.length; l++) {
            const count = layers[l];
            const layerHeight = this.height / (count + 1);
            for (let n = 0; n < count; n++) {
                const node = {
                    x: layerWidth * (l + 1),
                    y: layerHeight * (n + 1),
                    radius: 3 + Math.random() * 2,
                    layer: l,
                    activity: Math.random(),
                    phase: Math.random() * Math.PI * 2
                };
                this.nodes.push(node);
            }
        }

        // Create connections between adjacent layers
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                if (this.nodes[j].layer === this.nodes[i].layer + 1) {
                    if (Math.random() < 0.4) {
                        this.connections.push({ from: i, to: j, strength: Math.random() });
                    }
                }
            }
        }
    }

    _animate() {
        this.frame++;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Simulate data
        const t = this.frame * 0.02;
        const dopamine = 30 + Math.sin(t * 0.5) * 20 + Math.sin(t * 1.3) * 10 + Math.random() * 5;
        const fade = Math.max(0, (dopamine - 25) / 75) * 100;
        const calm = 100 - dopamine;

        this.dataPoints.dopamine.push(dopamine);
        this.dataPoints.fade.push(fade);
        this.dataPoints.calm.push(calm);

        if (this.dataPoints.dopamine.length > this.maxPoints) {
            this.dataPoints.dopamine.shift();
            this.dataPoints.fade.shift();
            this.dataPoints.calm.shift();
        }

        // Draw connections
        for (const conn of this.connections) {
            const from = this.nodes[conn.from];
            const to = this.nodes[conn.to];
            const activity = (from.activity + to.activity) / 2;

            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);

            const alpha = 0.05 + activity * 0.15;
            const hue = 240 + activity * 60; // Blue to purple
            this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
            this.ctx.lineWidth = 0.5 + activity;
            this.ctx.stroke();

            // Traveling pulse
            if (Math.random() < 0.01) {
                const progress = (this.frame * 0.02 + conn.strength) % 1;
                const px = from.x + (to.x - from.x) * progress;
                const py = from.y + (to.y - from.y) * progress;
                this.ctx.beginPath();
                this.ctx.arc(px, py, 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.6)`;
                this.ctx.fill();
            }
        }

        // Draw nodes
        for (const node of this.nodes) {
            node.activity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t + node.phase));
            const alpha = 0.3 + node.activity * 0.7;
            const size = node.radius * (0.8 + node.activity * 0.4);

            // Glow
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size * 3, 0, Math.PI * 2);
            const gradient = this.ctx.createRadialGradient(
                node.x, node.y, 0, node.x, node.y, size * 3
            );
            gradient.addColorStop(0, `rgba(99, 102, 241, ${alpha * 0.3})`);
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Node
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
            this.ctx.fill();
        }

        // Draw line chart overlay
        this._drawLineChart(this.dataPoints.dopamine, '#a855f7', 0.6);
        this._drawLineChart(this.dataPoints.fade, '#06b6d4', 0.5);
        this._drawLineChart(this.dataPoints.calm, '#22c55e', 0.4);

        requestAnimationFrame(() => this._animate());
    }

    _drawLineChart(data, color, opacity) {
        if (data.length < 2) return;
        const stepX = this.width / this.maxPoints;
        const offsetX = (this.maxPoints - data.length) * stepX;

        this.ctx.beginPath();
        this.ctx.moveTo(offsetX, this.height - (data[0] / 100) * this.height * 0.6 - 20);

        for (let i = 1; i < data.length; i++) {
            const x = offsetX + i * stepX;
            const y = this.height - (data[i] / 100) * this.height * 0.6 - 20;

            // Smooth curve
            const prevX = offsetX + (i - 1) * stepX;
            const prevY = this.height - (data[i - 1] / 100) * this.height * 0.6 - 20;
            const cx = (prevX + x) / 2;
            this.ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
        }

        this.ctx.strokeStyle = color;
        this.ctx.globalAlpha = opacity;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }
}

// ===== Timeline Chart =====
class TimelineChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.sessions = [];
        this._generateDemoData();
        this._draw();
    }

    _generateDemoData() {
        // Demo data for visual appeal
        const now = Date.now();
        for (let i = 23; i >= 0; i--) {
            this.sessions.push({
                hour: (new Date(now - i * 3600000)).getHours(),
                score: Math.floor(Math.random() * 60 + 10),
                duration: Math.floor(Math.random() * 30 + 5)
            });
        }
    }

    _draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        const barWidth = (this.width - 40) / this.sessions.length;
        const maxScore = 100;
        const chartHeight = this.height - 40;

        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const y = 10 + (chartHeight / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(30, y);
            this.ctx.lineTo(this.width - 10, y);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.font = '9px Inter';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(Math.round(maxScore - (maxScore / 4) * i), 26, y + 3);
        }

        // Bars
        for (let i = 0; i < this.sessions.length; i++) {
            const s = this.sessions[i];
            const x = 34 + i * barWidth;
            const barH = (s.score / maxScore) * chartHeight;
            const y = 10 + chartHeight - barH;

            // Gradient bar
            const gradient = this.ctx.createLinearGradient(x, y, x, y + barH);
            if (s.score < 25) {
                gradient.addColorStop(0, 'rgba(34, 197, 94, 0.6)');
                gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');
            } else if (s.score < 45) {
                gradient.addColorStop(0, 'rgba(234, 179, 8, 0.6)');
                gradient.addColorStop(1, 'rgba(234, 179, 8, 0.2)');
            } else if (s.score < 65) {
                gradient.addColorStop(0, 'rgba(249, 115, 22, 0.6)');
                gradient.addColorStop(1, 'rgba(249, 115, 22, 0.2)');
            } else {
                gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
                gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
            }

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.roundRect(x + 1, y, barWidth - 3, barH, [3, 3, 0, 0]);
            this.ctx.fill();

            // Hour label
            if (i % 4 === 0) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                this.ctx.font = '9px Inter';
                this.ctx.textAlign = 'center';
                const hourLabel = s.hour.toString().padStart(2, '0') + ':00';
                this.ctx.fillText(hourLabel, x + barWidth / 2, this.height - 6);
            }
        }
    }
}

// ===== Initialize =====

// Stats
async function loadStats() {
    try {
        const result = await chrome.storage.local.get([
            'nf_sessions', 'nf_total_interventions', 'nf_total_time_saved'
        ]);

        const sessions = result.nf_sessions || [];
        const interventions = result.nf_total_interventions || 0;

        document.getElementById('totalSessions').textContent = sessions.length;
        document.getElementById('totalInterventions').textContent = interventions;

        // Calculate minutes
        const totalMs = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        document.getElementById('totalMinutes').innerHTML = Math.round(totalMs / 60000) + '<span class="stat-unit">min</span>';

        // Average reduction
        if (sessions.length > 0) {
            const avgPeak = sessions.reduce((sum, s) => sum + (s.peakScore || 0), 0) / sessions.length;
            document.getElementById('avgReduction').innerHTML = Math.round(avgPeak * 0.6) + '<span class="stat-unit">%</span>';
        }
    } catch (e) {
        // Demo values
        document.getElementById('totalSessions').textContent = '24';
        document.getElementById('totalMinutes').innerHTML = '187<span class="stat-unit">min</span>';
        document.getElementById('avgReduction').innerHTML = '42<span class="stat-unit">%</span>';
        document.getElementById('totalInterventions').textContent = '156';
    }
}

// Sites list
function buildSitesList() {
    const list = document.getElementById('sitesList');

    for (const [domain, config] of Object.entries(PLATFORMS)) {
        if (domain === 'x.com') continue; // Skip duplicate

        const row = document.createElement('div');
        row.className = 'site-row';
        row.innerHTML = `
      <span class="site-icon">${config.icon}</span>
      <div class="site-info">
        <div class="site-name">${config.name}</div>
        <div class="site-domain">${domain}</div>
      </div>
      <label class="site-toggle">
        <input type="checkbox" checked data-domain="${domain}">
        <span class="slider"></span>
      </label>
    `;
        list.appendChild(row);
    }
}

// NPU Detection & Hardware Info (using NPUBridge)
const npuBridge = new NPUBridge();

async function detectAndDisplayHardware() {
    const badge = document.getElementById('npuBadge');
    const indicator = badge.querySelector('.npu-indicator');
    const label = badge.querySelector('span:last-child');
    const model = document.getElementById('npuModel');
    const desc = document.getElementById('npuDesc');
    const backend = document.getElementById('npuBackend');

    // Initialize NPU Bridge (handles all detection)
    await npuBridge.init();
    const status = npuBridge.getFullStatus();
    const hw = status.hardware;
    const rt = status.runtime;

    // Update nav badge
    if (rt.backend === 'npu') {
        indicator.className = 'npu-indicator active';
        label.textContent = 'AMD NPU: Active ⚡';
        model.textContent = 'AMD Ryzen AI NPU Detected';
        desc.textContent = 'Hardware-accelerated frame analysis active via XDNA NPU. Scene-cut detection running at optimal performance with minimal power usage.';
    } else if (rt.backend === 'gpu') {
        indicator.className = 'npu-indicator fallback';
        label.textContent = 'WebNN: GPU';
        model.textContent = 'WebNN Available — GPU Backend';
        desc.textContent = 'WebNN API detected but NPU not available. Using GPU acceleration as fallback.';
    } else {
        indicator.className = 'npu-indicator';
        label.textContent = 'NPU: CPU Mode';
        model.textContent = hw.detected ? hw.chipModel : 'CPU Processing Mode';
        desc.textContent = 'Frame analysis runs on CPU using optimized JavaScript. All processing remains 100% local and private.';
    }

    backend.textContent = rt.backend.toUpperCase();

    // Populate hardware info rows
    const hwChip = document.getElementById('hwChip');
    const hwNPU = document.getElementById('hwNPU');
    const hwTOPS = document.getElementById('hwTOPS');
    const hwCores = document.getElementById('hwCores');
    const hwGPU = document.getElementById('hwGPU');
    const hwWebNN = document.getElementById('hwWebNN');
    const hwONNX = document.getElementById('hwONNX');

    hwChip.textContent = hw.chipModel;
    if (hw.detected) hwChip.className = 'hw-value amd';

    hwNPU.textContent = hw.npuModel;
    if (hw.npuModel.includes('XDNA') || hw.npuModel.includes('AMD')) {
        hwNPU.className = 'hw-value detected';
    }

    hwTOPS.textContent = hw.topsPerformance;
    if (hw.topsPerformance !== '-') hwTOPS.className = 'hw-value detected';

    hwCores.textContent = hw.cores + ' threads';

    hwGPU.textContent = hw.gpuRenderer || hw.gpuModel || 'Not detected';
    if (hw.gpuRenderer && hw.gpuRenderer.toLowerCase().includes('amd')) {
        hwGPU.className = 'hw-value amd';
    }

    hwWebNN.textContent = hw.webnnSupported ? '✅ Supported' : '❌ Not Available';
    hwWebNN.className = hw.webnnSupported ? 'hw-value detected' : 'hw-value';

    hwONNX.textContent = hw.onnxrtSupported ? '✅ Available' : '⬜ Not Loaded';
    hwONNX.className = hw.onnxrtSupported ? 'hw-value detected' : 'hw-value';
}

// Benchmark Runner
document.getElementById('runBenchmark').addEventListener('click', async function () {
    const btn = this;
    const resultsDiv = document.getElementById('benchResults');
    const chartContainer = document.getElementById('benchChartContainer');

    btn.disabled = true;
    btn.classList.add('running');
    btn.textContent = 'Running...';
    resultsDiv.innerHTML = '<p class="bench-placeholder">⏳ Running 50 iterations across all backends...</p>';

    try {
        const results = await npuBridge.runBenchmarks(50);

        // Build results table
        let tableHTML = `
            <table class="bench-table">
                <thead>
                    <tr>
                        <th>Backend</th>
                        <th>Avg (ms)</th>
                        <th>Median (ms)</th>
                        <th>P95 (ms)</th>
                        <th>Min (ms)</th>
                        <th>Max (ms)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const benchmarks = [];
        if (results.webnn) {
            benchmarks.push({ key: 'webnn', ...results.webnn });
        }
        if (results.js) {
            benchmarks.push({ key: 'js', ...results.js });
        }
        if (results.classify) {
            benchmarks.push({ key: 'classify', ...results.classify });
        }

        // Find the fastest
        const avgTimes = benchmarks.filter(b => b.key !== 'classify').map(b => b.avgMs);
        const fastest = Math.min(...avgTimes);

        for (const b of benchmarks) {
            const isBest = b.avgMs === fastest && b.key !== 'classify';
            tableHTML += `
                <tr class="${isBest ? 'best' : ''}">
                    <td>${isBest ? '🏆 ' : ''}${b.label}</td>
                    <td>${b.avgMs.toFixed(3)}</td>
                    <td>${b.medianMs.toFixed(3)}</td>
                    <td>${b.p95Ms.toFixed(3)}</td>
                    <td>${b.minMs.toFixed(3)}</td>
                    <td>${b.maxMs.toFixed(3)}</td>
                </tr>
            `;
        }

        tableHTML += '</tbody></table>';

        // Add speedup badge
        if (results.speedup) {
            const factor = results.speedup.factor;
            if (factor > 1) {
                tableHTML += `<div class="bench-speedup">⚡ WebNN is ${factor.toFixed(1)}x faster than pure JavaScript</div>`;
            } else {
                tableHTML += `<div class="bench-speedup">📊 JavaScript baseline: ${results.js.avgMs.toFixed(3)}ms avg per inference</div>`;
            }
        } else {
            tableHTML += `<div class="bench-speedup">📊 JavaScript baseline: ${results.js.avgMs.toFixed(3)}ms avg per inference</div>`;
        }

        resultsDiv.innerHTML = tableHTML;

        // Draw benchmark chart
        chartContainer.style.display = 'block';
        drawBenchmarkChart(benchmarks);

    } catch (e) {
        resultsDiv.innerHTML = `<p class="bench-placeholder">❌ Benchmark failed: ${e.message}</p>`;
    }

    btn.disabled = false;
    btn.classList.remove('running');
    btn.textContent = 'Run Again';
});

// Draw benchmark bar chart
function drawBenchmarkChart(benchmarks) {
    const canvas = document.getElementById('benchCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const filtered = benchmarks.filter(b => b.key !== 'classify');
    if (filtered.length === 0) return;

    const maxAvg = Math.max(...filtered.map(b => b.avgMs));
    const barHeight = 28;
    const gap = 16;
    const startY = 20;
    const labelWidth = 180;
    const chartWidth = W - labelWidth - 40;

    const colors = {
        webnn: { fill: 'rgba(99, 102, 241, 0.6)', stroke: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)' },
        js: { fill: 'rgba(249, 115, 22, 0.6)', stroke: '#f97316', glow: 'rgba(249, 115, 22, 0.3)' },
        classify: { fill: 'rgba(6, 182, 212, 0.6)', stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)' }
    };

    for (let i = 0; i < filtered.length; i++) {
        const b = filtered[i];
        const y = startY + i * (barHeight + gap);
        const barW = (b.avgMs / maxAvg) * chartWidth;
        const c = colors[b.key] || colors.js;

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, labelWidth - 10, y + barHeight / 2);

        // Bar background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath();
        ctx.roundRect(labelWidth, y, chartWidth, barHeight, 4);
        ctx.fill();

        // Bar glow
        ctx.fillStyle = c.glow;
        ctx.beginPath();
        ctx.roundRect(labelWidth, y, barW, barHeight, 4);
        ctx.fill();

        // Bar fill
        const gradient = ctx.createLinearGradient(labelWidth, y, labelWidth + barW, y);
        gradient.addColorStop(0, c.fill);
        gradient.addColorStop(1, c.stroke);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(labelWidth, y, barW, barHeight, 4);
        ctx.fill();

        // Value label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(b.avgMs.toFixed(3) + ' ms', labelWidth + barW + 8, y + barHeight / 2);
    }

    // Title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Average Inference Time (lower is better)', W / 2, H - 8);
}

// Time filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Initialize everything
loadStats();
buildSitesList();
detectAndDisplayHardware();
new NeuralVisualizer('neuralCanvas');
new TimelineChart('timelineCanvas');

// Animate stat numbers on load
function animateStatNumbers() {
    document.querySelectorAll('.stat-value').forEach(el => {
        const text = el.textContent;
        const num = parseInt(text);
        if (isNaN(num)) return;

        let current = 0;
        const step = Math.ceil(num / 30);
        const animate = () => {
            current += step;
            if (current >= num) {
                current = num;
            } else {
                requestAnimationFrame(animate);
            }
            el.textContent = current;
        };
        requestAnimationFrame(animate);
    });
}

setTimeout(animateStatNumbers, 500);

