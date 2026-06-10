/**
 * GooeyNav - 粘性导航
 * 核心技术：基于 React Bits 研究
 * - SVG goo filter（高斯模糊 + 颜色矩阵）让圆形粒子融合
 * - 点击时从激活项中心放射粒子（CSS 自定义动画）
 * - 跟随激活项的指示器
 */

class GooeyNav {
    constructor(options = {}) {
        this.container = options.container;
        this.items = options.items || [];
        this.activeIndex = options.initialActiveIndex ?? 0;
        this.particleCount = options.particleCount ?? 14;
        this.particleDistances = options.particleDistances || [80, 10];
        this.particleR = options.particleR ?? 100;
        this.animationTime = options.animationTime ?? 600;
        this.timeVariance = options.timeVariance ?? 300;
        this.colors = options.colors || ['#5227FF', '#7cff67', '#FFB347', '#ff6b6b'];
        this.onChange = options.onChange || (() => {});

        this.uid = Math.random().toString(36).substr(2, 9);
        this.init();
    }

    noise(n = 1) {
        return n / 2 - Math.random() * n;
    }

    getXY(distance, idx, total) {
        const angle = ((360 + this.noise(8)) / total) * idx * (Math.PI / 180);
        return [distance * Math.cos(angle), distance * Math.sin(angle)];
    }

    init() {
        if (getComputedStyle(this.container).position === 'static') {
            this.container.style.position = 'relative';
        }

        // 注入样式（每个实例独立）
        const styleId = 'gooey-nav-style-' + this.uid;
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            const colorVars = this.colors.map((c, i) => `--gn-c${i + 1}: ${c};`).join('');
            style.textContent = `
                .gooey-nav-${this.uid} { ${colorVars} }
                .gooey-nav-${this.uid} .gn-particle {
                    position: absolute; top: 0; left: 0;
                    width: 0; height: 0;
                    transform: translate(var(--start-x), var(--start-y)) rotate(0deg);
                    animation: gn-particle-${this.uid} var(--time) ease-out forwards;
                    pointer-events: none;
                }
                .gooey-nav-${this.uid} .gn-particle .gn-point {
                    position: absolute;
                    top: -8px; left: -8px;
                    width: 16px; height: 16px;
                    background: var(--color);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: gn-point-${this.uid} var(--time) ease-out forwards;
                }
                @keyframes gn-particle-${this.uid} {
                    0%   { transform: translate(var(--start-x), var(--start-y)) rotate(0deg); }
                    70%  { transform: translate(var(--end-x), var(--end-y)) rotate(var(--rotate)); }
                    100% { transform: translate(var(--end-x), var(--end-y)) rotate(var(--rotate)); }
                }
                @keyframes gn-point-${this.uid} {
                    0%   { transform: scale(0); }
                    25%  { transform: scale(var(--scale)); }
                    100% { transform: scale(0); }
                }
                .gooey-nav-${this.uid} .gn-text {
                    transition: color 0.3s;
                }
                .gooey-nav-${this.uid} .gn-text.active {
                    color: #000;
                }
            `;
            document.head.appendChild(style);
        }

        // SVG filter（goo 效果）
        if (!document.getElementById('gn-filter-' + this.uid)) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '0');
            svg.setAttribute('height', '0');
            svg.style.position = 'absolute';
            svg.id = 'gn-filter-' + this.uid;
            svg.innerHTML = `
                <defs>
                    <filter id="gooey-${this.uid}">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                        <feColorMatrix mode="matrix"
                            values="1 0 0 0 0
                                    0 1 0 0 0
                                    0 0 1 0 0
                                    0 0 0 18 -7" />
                    </filter>
                </defs>
            `;
            document.body.appendChild(svg);
        }

        // wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'gooey-nav-' + this.uid;
        this.wrapper.style.cssText = `
            position: relative;
            display: inline-block;
        `;

        // nav
        this.nav = document.createElement('nav');
        this.nav.style.cssText = `
            position: relative;
            z-index: 2;
            display: flex;
            gap: 12px;
            padding: 4px;
        `;

        this.linkEls = [];
        this.items.forEach((item, idx) => {
            const a = document.createElement('a');
            a.href = item.href || '#';
            a.textContent = item.label;
            a.className = 'gn-text';
            a.style.cssText = `
                position: relative;
                z-index: 1;
                padding: 10px 22px;
                color: #fff;
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                user-select: none;
            `;
            if (idx === this.activeIndex) a.classList.add('active');
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleClick(idx, a);
            });
            this.nav.appendChild(a);
            this.linkEls.push(a);
        });

        // effect filter（粒子层）
        this.filterLayer = document.createElement('span');
        this.filterLayer.style.cssText = `
            position: absolute;
            background: #fff;
            border-radius: 999px;
            transition: all 0.4s cubic-bezier(0.5, 1.5, 0.5, 1);
            filter: blur(6px) url(#gooey-${this.uid});
            pointer-events: none;
            z-index: 1;
        `;

        // text overlay（黑色字盖在白色 blob 上）
        this.textLayer = document.createElement('span');
        this.textLayer.style.cssText = `
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #000;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.4s cubic-bezier(0.5, 1.5, 0.5, 1);
            pointer-events: none;
            z-index: 3;
        `;

        this.wrapper.appendChild(this.filterLayer);
        this.wrapper.appendChild(this.textLayer);
        this.wrapper.appendChild(this.nav);
        this.container.appendChild(this.wrapper);

        // 初始定位
        requestAnimationFrame(() => {
            this.updateEffect(this.linkEls[this.activeIndex]);
        });

        // 响应式
        this.resizeObserver = new ResizeObserver(() => {
            this.updateEffect(this.linkEls[this.activeIndex]);
        });
        this.resizeObserver.observe(this.wrapper);
    }

    updateEffect(el) {
        if (!el) return;
        const wRect = this.wrapper.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        const styles = {
            left: (eRect.left - wRect.left) + 'px',
            top: (eRect.top - wRect.top) + 'px',
            width: eRect.width + 'px',
            height: eRect.height + 'px'
        };
        Object.assign(this.filterLayer.style, styles);
        Object.assign(this.textLayer.style, styles);
        this.textLayer.textContent = el.textContent;
    }

    spawnParticles() {
        const layer = this.filterLayer;
        const d = this.particleDistances;
        const r = this.particleR;
        const bubbleTime = this.animationTime * 2 + this.timeVariance;
        layer.style.setProperty('--time', bubbleTime + 'ms');

        for (let i = 0; i < this.particleCount; i++) {
            const t = this.animationTime * 2 + this.noise(this.timeVariance * 2);
            const start = this.getXY(d[0], this.particleCount - i, this.particleCount);
            const end = this.getXY(d[1] + this.noise(7), this.particleCount - i, this.particleCount);
            const rotateNoise = this.noise(r / 10);
            const rotate = rotateNoise > 0 ? (rotateNoise + r / 20) * 10 : (rotateNoise - r / 20) * 10;
            const colorIdx = Math.floor(Math.random() * this.colors.length) + 1;
            const scale = 1 + this.noise(0.2);

            setTimeout(() => {
                const particle = document.createElement('span');
                const point = document.createElement('span');
                particle.className = 'gn-particle';
                point.className = 'gn-point';
                particle.style.setProperty('--start-x', start[0] + 'px');
                particle.style.setProperty('--start-y', start[1] + 'px');
                particle.style.setProperty('--end-x', end[0] + 'px');
                particle.style.setProperty('--end-y', end[1] + 'px');
                particle.style.setProperty('--time', t + 'ms');
                particle.style.setProperty('--scale', scale);
                particle.style.setProperty('--rotate', rotate + 'deg');
                particle.style.setProperty('--color', `var(--gn-c${colorIdx})`);
                particle.appendChild(point);
                layer.appendChild(particle);
                setTimeout(() => {
                    if (particle.parentNode) particle.parentNode.removeChild(particle);
                }, t);
            }, 30);
        }
    }

    handleClick(idx, el) {
        if (this.activeIndex === idx) return;
        this.activeIndex = idx;

        this.linkEls.forEach((a, i) => {
            a.classList.toggle('active', i === idx);
        });

        this.updateEffect(el);
        this.spawnParticles();
        this.onChange(idx);
    }

    setActive(idx) {
        if (this.linkEls[idx]) this.handleClick(idx, this.linkEls[idx]);
    }

    destroy() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        this.wrapper.remove();
    }
}
