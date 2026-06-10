/**
 * Prism - 棱镜光谱效果
 * 技术：旋转的光谱锥形 + 色散
 * 原创实现 - 使用 Canvas 2D 渐变实现彩虹色散效果
 */

class Prism {
    constructor(options = {}) {
        this.container = options.container;
        this.speed = options.speed || 0.5;
        this.scale = options.scale || 1.0;
        this.glowIntensity = options.glowIntensity || 1.0;
        this.bloom = options.bloom || 1.0;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.time = 0;
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
    }

    drawSpectrumBeam(cx, cy, angle, length, baseHue) {
        const ctx = this.ctx;
        const numLayers = 7; // 七色光

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // 多层叠加创造光谱
        for (let i = 0; i < numLayers; i++) {
            const t = i / numLayers;
            const hue = (baseHue + t * 60) % 360;
            const offset = (t - 0.5) * 30;

            const grd = ctx.createLinearGradient(0, 0, length, 0);
            grd.addColorStop(0, `hsla(${hue}, 100%, 65%, 0)`);
            grd.addColorStop(0.1, `hsla(${hue}, 100%, 65%, ${0.4 * this.glowIntensity})`);
            grd.addColorStop(0.5, `hsla(${hue}, 100%, 70%, ${0.6 * this.glowIntensity})`);
            grd.addColorStop(1, `hsla(${hue}, 100%, 65%, 0)`);

            ctx.fillStyle = grd;
            ctx.fillRect(0, offset - 4, length, 8);
        }

        ctx.restore();
    }

    animate() {
        this.time += 0.016 * this.speed;
        const ctx = this.ctx;
        const w = this.canvas.width, h = this.canvas.height;
        const cx = w / 2, cy = h / 2;
        const minDim = Math.min(w, h);
        const beamLength = minDim * 0.6 * this.scale;

        // 渐隐拖尾创造运动模糊
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // 中心棱镜核心
        const coreRadius = 30 * this.scale;
        const coreGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 4);
        coreGrd.addColorStop(0, `rgba(255, 255, 255, ${0.9 * this.bloom})`);
        coreGrd.addColorStop(0.3, `rgba(200, 220, 255, ${0.5 * this.bloom})`);
        coreGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrd;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius * 4, 0, Math.PI * 2);
        ctx.fill();

        // 旋转的光谱光束（多束发射）
        const numBeams = 6;
        for (let i = 0; i < numBeams; i++) {
            const baseAngle = (i / numBeams) * Math.PI * 2;
            const rotation = this.time * 0.5;
            const wobble = Math.sin(this.time * 0.7 + i) * 0.2;
            const angle = baseAngle + rotation + wobble;
            const baseHue = (i / numBeams) * 360 + this.time * 30;

            this.drawSpectrumBeam(cx, cy, angle, beamLength, baseHue);
        }

        // 柔和的光晕环
        for (let r = 0; r < 3; r++) {
            const ringRadius = (60 + r * 40) * this.scale;
            const ringHue = (this.time * 50 + r * 60) % 360;
            const ringGrd = ctx.createRadialGradient(cx, cy, ringRadius - 10, cx, cy, ringRadius + 20);
            ringGrd.addColorStop(0, `hsla(${ringHue}, 80%, 60%, 0)`);
            ringGrd.addColorStop(0.5, `hsla(${ringHue}, 90%, 65%, ${0.15 * this.bloom})`);
            ringGrd.addColorStop(1, `hsla(${ringHue}, 80%, 60%, 0)`);

            ctx.fillStyle = ringGrd;
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius + 20, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.canvas.remove();
    }
}
