/**
 * SideRays - 侧边光线效果
 * 技术：CSS 渐变 + 锥形光束动画
 * 原创实现
 */

class SideRays {
    constructor(options = {}) {
        this.container = options.container;
        this.color = options.color || '#00ffff';
        this.speed = options.speed || 1.0;
        this.rayCount = options.rayCount || 5;
        this.origin = options.origin || 'top-left'; // top-left, top-right, bottom-left, bottom-right

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

    getOriginPoint() {
        const w = this.canvas.width, h = this.canvas.height;
        switch (this.origin) {
            case 'top-right': return { x: w, y: 0 };
            case 'bottom-left': return { x: 0, y: h };
            case 'bottom-right': return { x: w, y: h };
            default: return { x: 0, y: 0 };
        }
    }

    hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        const int = parseInt(hex, 16);
        return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
    }

    animate() {
        this.time += 0.016 * this.speed;
        const ctx = this.ctx;
        const w = this.canvas.width, h = this.canvas.height;
        const origin = this.getOriginPoint();
        const [r, g, b] = this.hexToRgb(this.color);

        // 渐隐拖尾
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        const diag = Math.sqrt(w * w + h * h);

        for (let i = 0; i < this.rayCount; i++) {
            // 每条光线有不同的相位和角度
            const phase = i * (Math.PI * 2 / this.rayCount);
            const wobble = Math.sin(this.time * 0.5 + phase) * 0.3;

            // 根据 origin 计算扫射角度
            let baseAngle;
            switch (this.origin) {
                case 'top-right': baseAngle = Math.PI * 0.75; break;
                case 'bottom-left': baseAngle = -Math.PI * 0.25; break;
                case 'bottom-right': baseAngle = Math.PI * 1.25; break;
                default: baseAngle = Math.PI * 0.25;
            }

            const angle = baseAngle + wobble + Math.sin(this.time * 0.3 + i) * 0.4;
            const len = diag * 1.2;
            const endX = origin.x + Math.cos(angle) * len;
            const endY = origin.y + Math.sin(angle) * len;

            // 渐变锥形光束
            const intensity = 0.3 + 0.4 * Math.abs(Math.sin(this.time + phase * 1.7));

            const grd = ctx.createLinearGradient(origin.x, origin.y, endX, endY);
            grd.addColorStop(0, `rgba(${r},${g},${b},${intensity})`);
            grd.addColorStop(0.5, `rgba(${r},${g},${b},${intensity * 0.3})`);
            grd.addColorStop(1, `rgba(${r},${g},${b},0)`);

            ctx.fillStyle = grd;

            // 绘制三角形光束
            const spread = 0.15 + 0.05 * Math.sin(this.time + i);
            const ax = origin.x + Math.cos(angle - spread) * len;
            const ay = origin.y + Math.sin(angle - spread) * len;
            const bx = origin.x + Math.cos(angle + spread) * len;
            const by = origin.y + Math.sin(angle + spread) * len;

            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.closePath();
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
