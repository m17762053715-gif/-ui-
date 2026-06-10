/**
 * Dock - 程序坞效果
 * 技术：鼠标距离感应 + 缩放动画
 * 原创实现
 */

class Dock {
    constructor(options = {}) {
        this.container = options.container;
        this.items = options.items || [];
        this.maxScale = options.maxScale || 1.6;
        this.scaleRadius = options.scaleRadius || 100;
        this.iconSize = options.iconSize || 48;
        this.gap = options.gap || 8;
        this.background = options.background || 'rgba(255, 255, 255, 0.1)';

        this.init();
    }

    init() {
        // 创建 dock 容器
        this.dockEl = document.createElement('div');
        this.dockEl.style.cssText = `
            display: flex;
            align-items: flex-end;
            gap: ${this.gap}px;
            padding: 12px;
            background: ${this.background};
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        this.iconElements = [];

        this.items.forEach((item, idx) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                cursor: pointer;
                transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
                transform-origin: bottom center;
            `;

            const icon = document.createElement('div');
            icon.style.cssText = `
                width: ${this.iconSize}px;
                height: ${this.iconSize}px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${this.iconSize * 0.5}px;
                background: ${item.bgColor || 'rgba(255, 255, 255, 0.15)'};
                color: ${item.color || '#fff'};
            `;
            icon.textContent = item.icon || '🚀';

            // tooltip
            const tooltip = document.createElement('div');
            tooltip.style.cssText = `
                position: absolute;
                bottom: 100%;
                margin-bottom: 8px;
                padding: 4px 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                font-size: 12px;
                border-radius: 6px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s;
                pointer-events: none;
            `;
            tooltip.textContent = item.label || '';

            wrapper.appendChild(icon);
            wrapper.appendChild(tooltip);

            wrapper.addEventListener('mouseenter', () => {
                tooltip.style.opacity = '1';
            });
            wrapper.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });

            if (item.onClick) {
                wrapper.addEventListener('click', item.onClick);
            }

            this.dockEl.appendChild(wrapper);
            this.iconElements.push(wrapper);
        });

        this.container.appendChild(this.dockEl);

        // 鼠标移动时缩放
        this.dockEl.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.dockEl.addEventListener('mouseleave', () => this.handleMouseLeave());
    }

    handleMouseMove(e) {
        const dockRect = this.dockEl.getBoundingClientRect();
        const mouseX = e.clientX;

        this.iconElements.forEach((iconEl) => {
            const rect = iconEl.getBoundingClientRect();
            const iconCenter = rect.left + rect.width / 2;
            const distance = Math.abs(mouseX - iconCenter);

            if (distance < this.scaleRadius) {
                const scaleFactor = 1 - distance / this.scaleRadius;
                const scale = 1 + (this.maxScale - 1) * scaleFactor;
                iconEl.style.transform = `scale(${scale})`;
            } else {
                iconEl.style.transform = 'scale(1)';
            }
        });
    }

    handleMouseLeave() {
        this.iconElements.forEach((iconEl) => {
            iconEl.style.transform = 'scale(1)';
        });
    }

    destroy() {
        if (this.dockEl && this.dockEl.parentNode) {
            this.dockEl.parentNode.removeChild(this.dockEl);
        }
    }
}
