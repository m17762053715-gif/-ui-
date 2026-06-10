/**
 * MagnetLines - 磁性线条网格
 * 核心技术：基于 React Bits 研究
 * - 网格中的每条线根据鼠标位置旋转，指向鼠标方向
 * - 使用 atan2 计算每条线中心到鼠标的角度
 * - 鼠标移动时所有线同步更新
 */

class MagnetLines {
    constructor(options = {}) {
        this.container = options.container;
        this.rows = options.rows ?? 9;
        this.columns = options.columns ?? 9;
        this.lineColor = options.lineColor || '#efefef';
        this.lineWidth = options.lineWidth || '1vmin';
        this.lineHeight = options.lineHeight || '6vmin';
        this.baseAngle = options.baseAngle ?? -10;
        this.containerSize = options.containerSize || '80vmin';

        this.items = [];

        this.init();
    }

    init() {
        // 网格容器
        this.grid = document.createElement('div');
        this.grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.columns}, 1fr);
            grid-template-rows: repeat(${this.rows}, 1fr);
            width: ${this.containerSize};
            height: ${this.containerSize};
            place-items: center;
            place-content: center;
            margin: auto;
        `;

        // 创建线条
        const total = this.rows * this.columns;
        for (let i = 0; i < total; i++) {
            const line = document.createElement('span');
            line.style.cssText = `
                display: block;
                width: ${this.lineWidth};
                height: ${this.lineHeight};
                background-color: ${this.lineColor};
                transform: rotate(${this.baseAngle}deg);
                will-change: transform;
                transition: transform 0.1s ease-out;
            `;
            this.grid.appendChild(line);
            this.items.push(line);
        }

        this.container.appendChild(this.grid);

        // 初始指向中心
        const middleIdx = Math.floor(this.items.length / 2);
        requestAnimationFrame(() => {
            const rect = this.items[middleIdx].getBoundingClientRect();
            this.updateAngles(rect.x + rect.width / 2, rect.y + rect.height / 2);
        });

        // 鼠标移动事件
        this.moveHandler = (e) => this.updateAngles(e.clientX, e.clientY);
        window.addEventListener('pointermove', this.moveHandler);
    }

    updateAngles(px, py) {
        this.items.forEach(line => {
            const rect = line.getBoundingClientRect();
            const cx = rect.x + rect.width / 2;
            const cy = rect.y + rect.height / 2;

            // atan2 计算角度
            const dx = px - cx;
            const dy = py - cy;
            // 加 -90 因为线条默认竖直向上
            const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI - 90;

            line.style.transform = `rotate(${angleDeg}deg)`;
        });
    }

    destroy() {
        window.removeEventListener('pointermove', this.moveHandler);
        this.grid.remove();
    }
}
