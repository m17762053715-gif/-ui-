/**
 * SplashCursor - 鼠标流体喷溅
 * 核心思路：基于 React Bits 研究（原版用 Navier-Stokes 流体模拟）
 * - 简化：使用 metaball 风格的彩色粒子团
 * - 加性混合 + 大软粒子模拟流体感
 * - 速度产生喷溅、彩虹色循环
 */

class SplashCursor {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.particleCount = options.particleCount || 30;
        this.lifespan = options.lifespan || 1500;
        this.maxRadius = options.maxRadius || 80;
        this.rainbow = options.rainbow !== false;
        this.baseHue = options.baseHue ?? Math.random() * 360;
        this.splashForce = options.splashForce || 1.0;

        this.particles = [];
        this.lastX = 0;
        this.lastY = 0;
        this.lastTime = performance.now();
        this.hueOffset = 0;

        this.init();
    }

    init() {
        const isBody = this.container === document.body;
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: ${isBody ? 'fixed' : 'absolute'};
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        if (!isBody && getComputedStyle(this.container).position === 'static') {
            this.container.style.position = 'relative';
        }
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);

        this.moveHandler = (e) => this.onMove(e);
        const tgt = isBody ? window : this.container;
        tgt.addEventListener('mousemove', this.moveHandler);

        this.animate();
    }

    resize() {
        const isBody = this.container === document.body;
        const w = isBody ? window.innerWidth : this.container.offsetWidth;
        const h = isBody ? window.innerHeight : this.container.offsetHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = w;
        this.height = h;
    }

    onMove(e) {
        let x, y;
        if (this.container === document.body) {
            x = e.clientX; y = e.clientY;
        } else {
            const r = this.container.getBoundingClientRect();
            x = e.clientX - r.left;
            y = e.clientY - r.top;
        }

        const now = performance.now();
        const dt = Math.max(now - this.lastTime, 1);
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;

        // 速度越快产生越多粒子
        const count = Math.min(Math.ceil(speed * 8 * this.splashForce), this.particleCount);
        for (let i = 0; i < count; i++) {
            this.spawn(x, y, dx, dy, speed);
        }

        this.lastX = x;
        this.lastY = y;
        this.lastTime = now;
    }

    spawn(x, y, vx, vy, speed) {
        const angle = Math.random() * Math.PI * 2;
        const burst = 0.5 + Math.random() * 2.5;

        // 使用 HSL 让色彩流畅过渡
        const hue = this.rainbow
            ? (this.baseHue + this.hueOffset + Math.random() * 40) % 360
            : this.baseHue;

        this.particles.push({
            x, y,
            vx: Math.cos(angle) * burst + vx * 0.08,
            vy: Math.sin(angle) * burst + vy * 0.08,
            r: this.maxRadius * (0.4 + Math.random() * 0.6) * Math.min(speed * 0.5 + 0.5, 2),
            hue,
            born: performance.now(),
            life: this.lifespan * (0.6 + Math.random() * 0.4)
        });
    }

    animate() {
        const ctx = this.ctx;
        const now = performance.now();

        // 渐隐而非完全清除，制造拖尾
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, this.width, this.height);

        // 加性混合让粒子重叠时颜色更亮
        ctx.globalCompositeOperation = 'lighter';

        // 色相缓慢漂移
        this.hueOffset += 0.5;

        this.particles = this.particles.filter(p => {
            const age = now - p.born;
            if (age > p.life) return false;

            // 物理
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.93;
            p.vy *= 0.93;
            p.vy += 0.03; // 微重力

            const t = age / p.life;
            const alpha = (1 - t) * 0.6;
            const r = p.r * (1 - t * 0.5);

            // 大软渐变模拟流体团块
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            grd.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`);
            grd.addColorStop(0.4, `hsla(${(p.hue + 30) % 360}, 100%, 60%, ${alpha * 0.4})`);
            grd.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);

            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();

            return true;
        });

        ctx.globalCompositeOperation = 'source-over';
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.resizeHandler);
        const tgt = this.container === document.body ? window : this.container;
        tgt.removeEventListener('mousemove', this.moveHandler);
        this.canvas.remove();
    }
}
