/**
 * BorderGlow - 边框流光
 * 核心技术：基于 React Bits 研究
 * - 多层径向渐变：7 个不同位置的彩色光斑组合
 * - HSL 颜色 + 多层不透明度阴影
 * - 鼠标进入时容器轻微缩放
 */

class BorderGlow {
    constructor(options = {}) {
        this.element = options.element;
        this.colors = options.colors || ['#5227FF', '#7cff67', '#FFB347'];
        this.glowColor = options.glowColor || '#7cff67';
        this.intensity = options.intensity ?? 1.0;
        this.borderRadius = options.borderRadius ?? 16;
        this.duration = options.duration ?? 800;

        this.uid = Math.random().toString(36).substr(2, 9);
        this.init();
    }

    parseColor(color) {
        // 简单 hex/rgb 转 HSL
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const v = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16);
            r = (v >> 16) & 255; g = (v >> 8) & 255; b = v & 255;
        } else {
            const m = color.match(/(\d+)/g);
            if (!m) return { h: 200, s: 80, l: 60 };
            r = +m[0]; g = +m[1]; b = +m[2];
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }
        return { h, s: s * 100, l: l * 100 };
    }

    init() {
        const el = this.element;

        // 包装：保留原内容，加发光层
        if (getComputedStyle(el).position === 'static') {
            el.style.position = 'relative';
        }
        el.style.borderRadius = this.borderRadius + 'px';
        el.style.overflow = 'hidden';

        // 多层渐变位置（基于研究）
        const positions = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
        const colorCycle = this.colors.length;

        // 注入样式
        const styleId = 'border-glow-style-' + this.uid;
        const hsl = this.parseColor(this.glowColor);
        const baseHSL = `${hsl.h}deg ${hsl.s}% ${hsl.l}%`;
        const opacities = [100, 60, 50, 40, 30, 20, 10];
        const glowVars = opacities.map((op, i) => {
            const k = i === 0 ? '' : '-' + op;
            return `--bg${this.uid}-glow${k}: hsl(${baseHSL} / ${Math.min(op * this.intensity, 100)}%);`;
        }).join('');

        const gradients = positions.map((pos, i) => {
            const c = this.colors[i % colorCycle];
            return `radial-gradient(at ${pos}, ${c} 0px, transparent 50%)`;
        }).join(', ');

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .bg-${this.uid} { ${glowVars} }
            .bg-${this.uid}-bg {
                position: absolute;
                inset: 0;
                border-radius: inherit;
                background: ${gradients};
                background-size: 180% 180%;
                background-position: 0% 0%;
                opacity: 0.7;
                animation: bg-flow-${this.uid} ${this.duration * 6}ms ease-in-out infinite alternate;
                pointer-events: none;
                z-index: 0;
            }
            .bg-${this.uid}-border {
                position: absolute;
                inset: 0;
                border-radius: inherit;
                padding: 1.5px;
                background: conic-gradient(
                    from var(--bg-angle-${this.uid}, 0deg),
                    ${this.colors.join(', ')},
                    ${this.colors[0]}
                );
                -webkit-mask:
                    linear-gradient(#000 0 0) content-box,
                    linear-gradient(#000 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
                animation: bg-spin-${this.uid} ${this.duration * 5}ms linear infinite;
                pointer-events: none;
                z-index: 2;
            }
            .bg-${this.uid}-glow {
                position: absolute;
                inset: -2px;
                border-radius: inherit;
                box-shadow:
                    0 0 0 1px var(--bg${this.uid}-glow-60),
                    0 0 12px -2px var(--bg${this.uid}-glow-50),
                    0 0 24px -4px var(--bg${this.uid}-glow-40),
                    0 0 48px -6px var(--bg${this.uid}-glow-30),
                    inset 0 0 24px -4px var(--bg${this.uid}-glow-20);
                pointer-events: none;
                z-index: 1;
                opacity: 0.85;
            }
            @property --bg-angle-${this.uid} {
                syntax: '<angle>';
                initial-value: 0deg;
                inherits: false;
            }
            @keyframes bg-spin-${this.uid} {
                to { --bg-angle-${this.uid}: 360deg; }
            }
            @keyframes bg-flow-${this.uid} {
                0%   { background-position: 0% 0%; transform: scale(1); }
                50%  { background-position: 100% 100%; transform: scale(1.05); }
                100% { background-position: 0% 100%; transform: scale(1); }
            }
        `;
        if (!document.getElementById(styleId)) {
            document.head.appendChild(style);
        }

        el.classList.add('bg-' + this.uid);

        // 创建三层
        this.bg = document.createElement('div');
        this.bg.className = `bg-${this.uid}-bg`;
        this.glow = document.createElement('div');
        this.glow.className = `bg-${this.uid}-glow`;
        this.border = document.createElement('div');
        this.border.className = `bg-${this.uid}-border`;

        // 内容包装
        const children = Array.from(el.childNodes);
        this.contentWrap = document.createElement('div');
        this.contentWrap.style.cssText = `
            position: relative;
            z-index: 3;
            width: 100%;
            height: 100%;
        `;
        children.forEach(c => this.contentWrap.appendChild(c));

        el.appendChild(this.bg);
        el.appendChild(this.glow);
        el.appendChild(this.border);
        el.appendChild(this.contentWrap);
    }

    destroy() {
        [this.bg, this.glow, this.border].forEach(n => n && n.remove());
        if (this.contentWrap) {
            const children = Array.from(this.contentWrap.childNodes);
            children.forEach(c => this.element.appendChild(c));
            this.contentWrap.remove();
        }
        this.element.classList.remove('bg-' + this.uid);
    }
}
