/**
 * Dock - macOS 程序坞
 * 核心技术：基于 React Bits 研究
 * - 关键：根据鼠标 X 与图标中心距离插值 width/height（不是简单 scale）
 * - 弹簧动画使尺寸变化平滑
 * - hover 时显示 tooltip 标签
 */

class Dock {
    constructor(options = {}) {
        this.container = options.container;
        this.items = options.items || [];
        this.distance = options.distance || 200;       // 影响范围（px）
        this.baseSize = options.baseSize || 50;         // 基础尺寸
        this.magnification = options.magnification || 70; // 放大后尺寸
        this.panelHeight = options.panelHeight || 64;
        this.spring = options.spring || { stiffness: 0.2, damping: 0.7 };

        this.mouseX = Infinity;
        this.iconStates = [];

        this.init();
        this.animate();
    }

    init() {
        this.dock = document.createElement('div');
        this.dock.style.cssText = `
            display: inline-flex;
            align-items: flex-end;
            gap: 16px;
            height: ${this.panelHeight}px;
            padding: 0 8px;
            background: rgba(6, 6, 6, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            box-sizing: border-box;
        `;

        this.iconElements = [];

        this.items.forEach((item, idx) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                background: ${item.bgColor || 'rgba(255, 255, 255, 0.1)'};
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                cursor: pointer;
                color: ${item.color || '#fff'};
                will-change: width, height;
                flex-shrink: 0;
            `;

            // icon
            const icon = document.createElement('div');
            icon.style.cssText = `
                font-size: 60%;
                line-height: 1;
                pointer-events: none;
            `;
            icon.textContent = item.icon || '·';
            wrapper.appendChild(icon);

            // tooltip
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute;
                bottom: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%) translateY(6px);
                padding: 4px 10px;
                background: rgba(6, 6, 6, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #fff;
                font-size: 12px;
                white-space: nowrap;
                border-radius: 6px;
                opacity: 0;
                transition: opacity 0.2s, transform 0.2s;
                pointer-events: none;
            `;
            label.textContent = item.label || '';
            wrapper.appendChild(label);

            wrapper.addEventListener('mouseenter', () => {
                label.style.opacity = '1';
                label.style.transform = 'translateX(-50%) translateY(0)';
            });
            wrapper.addEventListener('mouseleave', () => {
                label.style.opacity = '0';
                label.style.transform = 'translateX(-50%) translateY(6px)';
            });

            if (item.onClick) {
                wrapper.addEventListener('click', item.onClick);
            }

            this.dock.appendChild(wrapper);
            this.iconElements.push(wrapper);
            this.iconStates.push({
                size: this.baseSize,
                target: this.baseSize,
                vel: 0
            });
        });

        this.container.appendChild(this.dock);

        // 鼠标事件绑定到整个 dock
        this.dock.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
        });
        this.dock.addEventListener('mouseleave', () => {
            this.mouseX = Infinity;
        });
    }

    animate() {
        // 计算每个图标的目标尺寸
        this.iconElements.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const dist = this.mouseX - center;

            // 距离范围内才放大
            const absD = Math.abs(dist);
            if (absD < this.distance) {
                const t = 1 - absD / this.distance;
                // 平滑插值（使用 cosine 曲线让中心放大最多）
                const eased = (1 - Math.cos(t * Math.PI)) / 2;
                this.iconStates[i].target = this.baseSize + (this.magnification - this.baseSize) * eased;
            } else {
                this.iconStates[i].target = this.baseSize;
            }

            // 弹簧物理
            const s = this.iconStates[i];
            const force = (s.target - s.size) * this.spring.stiffness;
            s.vel = (s.vel + force) * this.spring.damping;
            s.size += s.vel;

            el.style.width = s.size + 'px';
            el.style.height = s.size + 'px';
            // 字体随尺寸变化
            el.firstChild.style.fontSize = (s.size * 0.5) + 'px';
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.dock.remove();
    }
}
