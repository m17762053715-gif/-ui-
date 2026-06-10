/**
 * ShinyText - 闪光文字
 * 核心技术：基于 React Bits 研究
 * - 渐变背景 + background-clip: text 让渐变只在文字内显示
 * - 渐变水平动画造成闪光从左到右扫过
 * - 文字本身半透明，渐变高亮部分变白
 */

class ShinyText {
    constructor(options = {}) {
        this.container = options.container;
        this.text = options.text || 'Shiny Text';
        this.speed = options.speed ?? 5;          // 动画周期（秒）
        this.disabled = options.disabled || false;
        this.baseColor = options.baseColor || 'rgba(180, 180, 180, 0.7)';
        this.shineColor = options.shineColor || '#ffffff';
        this.fontSize = options.fontSize || 48;
        this.fontWeight = options.fontWeight || 700;

        this.uid = Math.random().toString(36).substr(2, 9);
        this.init();
    }

    init() {
        // 注入动画
        const styleId = 'shiny-text-' + this.uid;
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes shine-${this.uid} {
                    0%   { background-position: 100% center; }
                    100% { background-position: -100% center; }
                }
            `;
            document.head.appendChild(style);
        }

        this.el = document.createElement('span');
        this.el.textContent = this.text;
        this.el.style.cssText = `
            display: inline-block;
            font-size: ${this.fontSize}px;
            font-weight: ${this.fontWeight};
            color: ${this.baseColor};
            background: linear-gradient(
                120deg,
                ${this.baseColor} 0%,
                ${this.baseColor} 40%,
                ${this.shineColor} 50%,
                ${this.baseColor} 60%,
                ${this.baseColor} 100%
            );
            background-size: 200% auto;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            ${this.disabled ? '' : `animation: shine-${this.uid} ${this.speed}s linear infinite;`}
        `;

        this.container.appendChild(this.el);
    }

    setText(text) {
        this.text = text;
        this.el.textContent = text;
    }

    pause() {
        this.el.style.animation = 'none';
    }

    resume() {
        this.el.style.animation = `shine-${this.uid} ${this.speed}s linear infinite`;
    }

    destroy() {
        this.el.remove();
    }
}
