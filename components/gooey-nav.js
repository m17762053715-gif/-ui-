/**
 * GooeyNav - 粘性导航
 * 技术：SVG filter goo + 弹性动画
 * 原创实现
 */

class GooeyNav {
    constructor(options = {}) {
        this.container = options.container;
        this.items = options.items || [];
        this.activeIndex = options.activeIndex ?? 0;
        this.color = options.color || '#667eea';
        this.onChange = options.onChange || (() => {});

        this.init();
    }

    init() {
        // SVG 滤镜 (goo 效果)
        const filterId = 'gooey_' + Math.random().toString(36).substr(2, 9);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.innerHTML = `
            <defs>
                <filter id="${filterId}">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feColorMatrix in="blur" mode="matrix"
                        values="1 0 0 0 0
                                0 1 0 0 0
                                0 0 1 0 0
                                0 0 0 18 -7" result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
            </defs>
        `;
        document.body.appendChild(svg);

        this.nav = document.createElement('nav');
        this.nav.style.cssText = `
            position: relative;
            display: inline-flex;
            padding: 6px;
            background: rgba(255,255,255,0.05);
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.1);
            filter: url(#${filterId});
        `;

        // 活动指示器（圆形 blob）
        this.indicator = document.createElement('div');
        this.indicator.style.cssText = `
            position: absolute;
            top: 6px;
            height: calc(100% - 12px);
            background: ${this.color};
            border-radius: 999px;
            transition: left 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), width 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            z-index: 0;
        `;
        this.nav.appendChild(this.indicator);

        // 链接项
        this.itemElements = [];
        this.items.forEach((item, idx) => {
            const link = document.createElement('a');
            link.textContent = item.label || item;
            link.href = item.href || '#';
            link.style.cssText = `
                position: relative;
                z-index: 1;
                padding: 10px 20px;
                color: ${idx === this.activeIndex ? '#fff' : 'rgba(255,255,255,0.7)'};
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: color 0.3s;
            `;

            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.setActive(idx);
            });

            this.nav.appendChild(link);
            this.itemElements.push(link);
        });

        this.container.appendChild(this.nav);

        // 等待 DOM 渲染后定位
        requestAnimationFrame(() => this.updateIndicator());
    }

    updateIndicator() {
        const activeEl = this.itemElements[this.activeIndex];
        if (!activeEl) return;

        const navRect = this.nav.getBoundingClientRect();
        const itemRect = activeEl.getBoundingClientRect();

        this.indicator.style.left = (itemRect.left - navRect.left) + 'px';
        this.indicator.style.width = itemRect.width + 'px';
    }

    setActive(idx) {
        this.activeIndex = idx;

        this.itemElements.forEach((el, i) => {
            el.style.color = i === idx ? '#fff' : 'rgba(255,255,255,0.7)';
        });

        this.updateIndicator();
        this.onChange(idx);
    }

    destroy() {
        this.nav.remove();
    }
}
