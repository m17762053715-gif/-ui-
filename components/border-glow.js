/**
 * BorderGlow - 边框流光效果
 * 技术：CSS conic-gradient + 动画
 * 原创实现
 */

class BorderGlow {
    constructor(options = {}) {
        this.element = options.element;
        this.colors = options.colors || ['#ff0080', '#7928ca', '#0070f3', '#00ff88'];
        this.duration = options.duration || 4;
        this.thickness = options.thickness || 2;
        this.borderRadius = options.borderRadius || 12;

        this.init();
    }

    init() {
        // 创建唯一动画名
        const animId = 'borderGlowSpin_' + Math.random().toString(36).substr(2, 9);

        // 注入动画样式
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            @keyframes ${animId} {
                0% { --glow-angle: 0deg; }
                100% { --glow-angle: 360deg; }
            }
            @property --glow-angle {
                syntax: '<angle>';
                initial-value: 0deg;
                inherits: false;
            }
        `;
        document.head.appendChild(styleEl);

        // 设置元素样式
        const colorStops = this.colors.join(', ') + ', ' + this.colors[0];

        this.element.style.position = 'relative';
        this.element.style.borderRadius = this.borderRadius + 'px';
        this.element.style.background = this.element.style.background || '#0a0a0a';

        // 创建发光层
        const glowLayer = document.createElement('div');
        glowLayer.style.cssText = `
            position: absolute;
            inset: -${this.thickness}px;
            border-radius: ${this.borderRadius + this.thickness}px;
            padding: ${this.thickness}px;
            background: conic-gradient(from var(--glow-angle), ${colorStops});
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            animation: ${animId} ${this.duration}s linear infinite;
            pointer-events: none;
            z-index: 0;
        `;

        this.element.insertBefore(glowLayer, this.element.firstChild);
        this.glowLayer = glowLayer;

        // 确保内容在上层
        Array.from(this.element.children).forEach(child => {
            if (child !== glowLayer && child.style) {
                child.style.position = child.style.position || 'relative';
                child.style.zIndex = child.style.zIndex || '1';
            }
        });
    }

    destroy() {
        if (this.glowLayer && this.glowLayer.parentNode) {
            this.glowLayer.parentNode.removeChild(this.glowLayer);
        }
    }
}
