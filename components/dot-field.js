/**
 * DotField - 点阵效果
 * 技术：网格点 + 鼠标交互波纹
 * 原创实现
 */

class DotField {
    constructor(options = {}) {
        this.container = options.container;
        this.dotSize = options.dotSize || 2;
        this.dotSpacing = options.dotSpacing || 25;
        this.dotColor = options.dotColor || '#667eea';
        this.glowColor = options.glowColor || '#ffffff';
        this.influenceRadius = options.influenceRadius || 120;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.dots = [];
        this.mouse = { x: -1000, y: -1000, active: false };

        this.resize();
        this.setupEvents();
        this.animate();
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        this.generateDots();
    }

    generateDots() {
        this.dots = [];
        const cols = Math.ceil(this.canvas.width / this.dotSpacing) + 1;
        const rows = Math.ceil(this.canvas.height / this.dotSpacing) + 1;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                this.dots.push({
                    ox: i * this.dotSpacing,
                    oy: j * this.dotSpacing,
                    x: i * this.dotSpacing,
                    y: j * this.dotSpacing,
                    glow: 0
                });
            }
        }
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.mouse.active = true;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.active = false;
            this.mouse.x = -1000;
            this.mouse.y = -1000;
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.dots.forEach(dot => {
            const dx = dot.ox - this.mouse.x;
            const dy = dot.oy - this.mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.influenceRadius && this.mouse.active) {
                // 排斥效果
                const force = (1 - dist / this.influenceRadius);
                const push = force * 30;
                const nx = dx / Math.max(dist, 1);
                const ny = dy / Math.max(dist, 1);

                dot.x += (dot.ox + nx * push - dot.x) * 0.15;
                dot.y += (dot.oy + ny * push - dot.y) * 0.15;
                dot.glow += (force - dot.glow) * 0.2;
            } else {
                // 回弹
                dot.x += (dot.ox - dot.x) * 0.1;
                dot.y += (dot.oy - dot.y) * 0.1;
                dot.glow *= 0.92;
            }

            // 绘制
            const size = this.dotSize + dot.glow * 4;

            if (dot.glow > 0.05) {
                // 发光效果
                const grd = this.ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, size * 4);
                grd.addColorStop(0, this.glowColor + Math.floor(dot.glow * 200).toString(16).padStart(2, '0'));
                grd.addColorStop(1, this.glowColor + '00');
                this.ctx.fillStyle = grd;
                this.ctx.beginPath();
                this.ctx.arc(dot.x, dot.y, size * 4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.fillStyle = this.dotColor;
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.canvas.remove();
    }
}
