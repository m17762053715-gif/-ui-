/**
 * SplashCursor - 鼠标喷溅光标
 * 技术：粒子系统 + 鼠标速度感应
 * 原创实现
 */

class SplashCursor {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.colors = options.colors || ['#ff0080', '#7928ca', '#0070f3', '#00ff88', '#ffaa00'];
        this.particleCount = options.particleCount || 20;
        this.lifespan = options.lifespan || 800;
        this.maxSize = options.maxSize || 30;

        this.particles = [];
        this.lastX = 0;
        this.lastY = 0;
        this.lastTime = performance.now();

        this.init();
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: ${this.container === document.body ? 'fixed' : 'absolute'};
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 9999;
        `;

        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.handler = (e) => this.onMouseMove(e);
        const target = this.container === document.body ? window : this.container;
        target.addEventListener('mousemove', this.handler);

        this.animate();
    }

    resize() {
        if (this.container === document.body) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        } else {
            const rect = this.container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }
    }

    onMouseMove(e) {
        let x, y;
        if (this.container === document.body) {
            x = e.clientX;
            y = e.clientY;
        } else {
            const rect = this.container.getBoundingClientRect();
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        const now = performance.now();
        const dt = now - this.lastTime;
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const speed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 1);

        // 速度越快产生越多粒子
        const count = Math.min(Math.floor(speed * 3), this.particleCount);

        for (let i = 0; i < count; i++) {
            this.spawn(x, y, dx, dy);
        }

        this.lastX = x;
        this.lastY = y;
        this.lastTime = now;
    }

    spawn(x, y, vx, vy) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;

        this.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed + vx * 0.05,
            vy: Math.sin(angle) * speed + vy * 0.05,
            size: 4 + Math.random() * (this.maxSize - 4),
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            born: performance.now(),
            life: this.lifespan * (0.5 + Math.random() * 0.5)
        });
    }

    animate() {
        const now = performance.now();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 启用混合模式让粒子叠加更绚丽
        this.ctx.globalCompositeOperation = 'lighter';

        this.particles = this.particles.filter(p => {
            const age = now - p.born;
            if (age > p.life) return false;

            // 物理更新
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.vy += 0.08; // 微重力

            // 渐变透明度和大小
            const t = age / p.life;
            const alpha = 1 - t;
            const size = p.size * (1 - t * 0.6);

            const grd = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
            grd.addColorStop(0, p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
            grd.addColorStop(1, p.color + '00');

            this.ctx.fillStyle = grd;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            this.ctx.fill();

            return true;
        });

        this.ctx.globalCompositeOperation = 'source-over';
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        const target = this.container === document.body ? window : this.container;
        target.removeEventListener('mousemove', this.handler);
        this.canvas.remove();
    }
}
