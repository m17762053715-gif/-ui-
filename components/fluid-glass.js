/**
 * FluidGlass - 流体玻璃效果
 * 技术：跟随鼠标的玻璃球 + 折射模糊
 * 原创实现 - 使用 backdrop-filter 模拟透镜折射
 */

class FluidGlass {
    constructor(options = {}) {
        this.container = options.container;
        this.size = options.size || 120;
        this.blur = options.blur || 8;
        this.distortion = options.distortion || 1.0;
        this.borderColor = options.borderColor || 'rgba(255, 255, 255, 0.3)';

        this.targetX = 0;
        this.targetY = 0;
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        this.targetScale = 1;

        this.init();
    }

    init() {
        // 容器要 relative 定位
        const computedPosition = window.getComputedStyle(this.container).position;
        if (computedPosition === 'static') {
            this.container.style.position = 'relative';
        }

        // 玻璃透镜
        this.lens = document.createElement('div');
        this.lens.style.cssText = `
            position: absolute;
            width: ${this.size}px;
            height: ${this.size}px;
            border-radius: 50%;
            backdrop-filter: blur(${this.blur}px) saturate(180%);
            -webkit-backdrop-filter: blur(${this.blur}px) saturate(180%);
            background: radial-gradient(
                circle at 30% 30%,
                rgba(255, 255, 255, 0.25),
                rgba(255, 255, 255, 0.05) 40%,
                rgba(255, 255, 255, 0) 70%
            );
            border: 1px solid ${this.borderColor};
            box-shadow:
                inset 0 0 30px rgba(255, 255, 255, 0.1),
                inset 0 4px 20px rgba(255, 255, 255, 0.2),
                0 8px 32px rgba(0, 0, 0, 0.2);
            pointer-events: none;
            transform-origin: center;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 100;
        `;

        // 内部高光
        const highlight = document.createElement('div');
        highlight.style.cssText = `
            position: absolute;
            top: 15%;
            left: 25%;
            width: 30%;
            height: 20%;
            background: radial-gradient(ellipse, rgba(255,255,255,0.6), rgba(255,255,255,0));
            border-radius: 50%;
            filter: blur(2px);
        `;
        this.lens.appendChild(highlight);

        this.container.appendChild(this.lens);

        // 事件
        this.handleMove = (e) => {
            const rect = this.container.getBoundingClientRect();
            this.targetX = e.clientX - rect.left;
            this.targetY = e.clientY - rect.top;
            this.lens.style.opacity = '1';
        };

        this.handleLeave = () => {
            this.lens.style.opacity = '0';
        };

        this.handleDown = () => {
            this.targetScale = 1.3;
        };

        this.handleUp = () => {
            this.targetScale = 1;
        };

        this.container.addEventListener('mousemove', this.handleMove);
        this.container.addEventListener('mouseleave', this.handleLeave);
        this.container.addEventListener('mousedown', this.handleDown);
        this.container.addEventListener('mouseup', this.handleUp);

        this.animate();
    }

    animate() {
        // 平滑跟随
        const ease = 0.15;
        this.x += (this.targetX - this.x) * ease;
        this.y += (this.targetY - this.y) * ease;
        this.scale += (this.targetScale - this.scale) * 0.2;

        // 速度产生形变
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const speed = Math.sqrt(dx * dx + dy * dy);
        const stretchX = 1 + Math.min(speed / 100, 0.3) * this.distortion;
        const stretchY = 1 - Math.min(speed / 200, 0.15) * this.distortion;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        this.lens.style.left = (this.x - this.size / 2) + 'px';
        this.lens.style.top = (this.y - this.size / 2) + 'px';
        this.lens.style.transform = `rotate(${angle}deg) scale(${this.scale * stretchX}, ${this.scale * stretchY}) rotate(${-angle}deg)`;

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.container.removeEventListener('mousemove', this.handleMove);
        this.container.removeEventListener('mouseleave', this.handleLeave);
        this.container.removeEventListener('mousedown', this.handleDown);
        this.container.removeEventListener('mouseup', this.handleUp);
        this.lens.remove();
    }
}
