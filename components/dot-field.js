/**
 * DotField - 点阵效果
 * 核心算法：基于 React Bits 研究
 * - bulge 效果：鼠标位置向内凹陷（dots 向鼠标拉近）
 * - engagement：基于鼠标速度的参与度
 * - 跟随鼠标的 SVG 径向光晕
 */

class DotField {
    constructor(options = {}) {
        this.container = options.container;
        this.dotRadius = options.dotRadius || 1.5;
        this.dotSpacing = options.dotSpacing || 14;
        this.cursorRadius = options.cursorRadius || 500;
        this.bulgeStrength = options.bulgeStrength || 67;
        this.glowRadius = options.glowRadius || 160;
        this.gradientFrom = options.gradientFrom || 'rgba(168, 85, 247, 0.35)';
        this.gradientTo = options.gradientTo || 'rgba(180, 151, 207, 0.25)';
        this.glowColor = options.glowColor || '#a855f7';

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        this.ctx = this.canvas.getContext('2d', { alpha: true });

        // SVG glow layer
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradId = 'dotglow_' + Math.random().toString(36).substr(2, 9);
        defs.innerHTML = `
            <radialGradient id="${gradId}">
                <stop offset="0%" stop-color="${this.glowColor}" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="${this.glowColor}" stop-opacity="0"/>
            </radialGradient>
        `;
        this.svg.appendChild(defs);
        this.glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.glowCircle.setAttribute('r', this.glowRadius);
        this.glowCircle.setAttribute('fill', `url(#${gradId})`);
        this.glowCircle.style.opacity = 0;
        this.svg.appendChild(this.glowCircle);

        // 容器需要 relative
        if (getComputedStyle(this.container).position === 'static') {
            this.container.style.position = 'relative';
        }
        this.container.appendChild(this.canvas);
        this.container.appendChild(this.svg);

        this.dots = [];
        this.mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
        this.engagement = 0;
        this.glowOpacity = 0;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.resize();
        this.setupEvents();
        this.speedTimer = setInterval(() => this.updateSpeed(), 20);
        this.animate();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        const w = rect.width, h = rect.height;
        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.width = w;
        this.height = h;
        this.buildDots();
    }

    buildDots() {
        const step = this.dotRadius + this.dotSpacing;
        const cols = Math.floor(this.width / step);
        const rows = Math.floor(this.height / step);
        const padX = (this.width % step) / 2;
        const padY = (this.height % step) / 2;
        this.dots = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const ax = padX + c * step + step / 2;
                const ay = padY + r * step + step / 2;
                this.dots.push({ ax, ay, sx: ax, sy: ay });
            }
        }
    }

    setupEvents() {
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);

        this.moveHandler = (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        };
        this.leaveHandler = () => {
            this.mouse.x = -9999;
            this.mouse.y = -9999;
        };

        this.container.addEventListener('mousemove', this.moveHandler);
        this.container.addEventListener('mouseleave', this.leaveHandler);
    }

    updateSpeed() {
        const m = this.mouse;
        const dx = m.prevX - m.x;
        const dy = m.prevY - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        m.speed += (dist - m.speed) * 0.5;
        if (m.speed < 0.001) m.speed = 0;
        m.prevX = m.x;
        m.prevY = m.y;
    }

    animate() {
        const ctx = this.ctx;
        const m = this.mouse;

        // engagement based on mouse speed
        const targetEng = Math.min(m.speed / 5, 1);
        this.engagement += (targetEng - this.engagement) * 0.06;
        if (this.engagement < 0.001) this.engagement = 0;
        const eng = this.engagement;

        // glow follow mouse
        this.glowOpacity += (eng - this.glowOpacity) * 0.08;
        this.glowCircle.setAttribute('cx', m.x);
        this.glowCircle.setAttribute('cy', m.y);
        this.glowCircle.style.opacity = this.glowOpacity;

        ctx.clearRect(0, 0, this.width, this.height);

        // gradient fill for dots
        const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
        grad.addColorStop(0, this.gradientFrom);
        grad.addColorStop(1, this.gradientTo);
        ctx.fillStyle = grad;

        const cr = this.cursorRadius;
        const crSq = cr * cr;
        const rad = this.dotRadius;

        ctx.beginPath();

        for (let i = 0; i < this.dots.length; i++) {
            const d = this.dots[i];
            const dx = m.x - d.ax;
            const dy = m.y - d.ay;
            const distSq = dx * dx + dy * dy;

            if (distSq < crSq && eng > 0.01) {
                // bulge: 向鼠标方向凹陷（dots 被拉近鼠标）
                const dist = Math.sqrt(distSq);
                const t = 1 - dist / cr;
                const push = t * t * this.bulgeStrength * eng;
                const angle = Math.atan2(dy, dx);
                // 向鼠标方向移动
                const tx = d.ax + Math.cos(angle) * push;
                const ty = d.ay + Math.sin(angle) * push;
                d.sx += (tx - d.sx) * 0.15;
                d.sy += (ty - d.sy) * 0.15;
            } else {
                // 弹回原位
                d.sx += (d.ax - d.sx) * 0.1;
                d.sy += (d.ay - d.sy) * 0.1;
            }

            ctx.moveTo(d.sx + rad, d.sy);
            ctx.arc(d.sx, d.sy, rad, 0, Math.PI * 2);
        }

        ctx.fill();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.speedTimer) clearInterval(this.speedTimer);
        window.removeEventListener('resize', this.resizeHandler);
        this.container.removeEventListener('mousemove', this.moveHandler);
        this.container.removeEventListener('mouseleave', this.leaveHandler);
        this.canvas.remove();
        this.svg.remove();
    }
}
