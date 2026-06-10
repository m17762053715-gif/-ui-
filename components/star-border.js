/**
 * StarBorder - 星光边框
 * 核心技术：基于 React Bits 研究
 * - 上下边缘各有一个径向渐变光斑沿水平方向滑动
 * - 两个动画方向相反，造成"环绕"视觉
 * - 内容层在最上层
 */

class StarBorder {
    constructor(options = {}) {
        this.element = options.element;
        this.color = options.color || '#ffffff';
        this.speed = options.speed || '6s';
        this.thickness = options.thickness ?? 1;
        this.borderRadius = options.borderRadius ?? 20;

        this.uid = Math.random().toString(36).substr(2, 9);
        this.init();
    }

    init() {
        const el = this.element;
        if (getComputedStyle(el).position === 'static') {
            el.style.position = 'relative';
        }
        el.style.overflow = 'hidden';
        el.style.borderRadius = this.borderRadius + 'px';
        el.style.padding = `${this.thickness}px 0`;

        // 注入唯一动画
        const styleId = 'star-border-' + this.uid;
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes sb-slide-right-${this.uid} {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(0%); }
                }
                @keyframes sb-slide-left-${this.uid} {
                    0%   { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
            `;
            document.head.appendChild(style);
        }

        // 底部光斑（向右滑）
        this.bottomLayer = document.createElement('div');
        this.bottomLayer.style.cssText = `
            position: absolute;
            bottom: -11px;
            right: -250%;
            width: 300%;
            height: 50%;
            opacity: 0.7;
            background: radial-gradient(circle, ${this.color}, transparent 10%);
            animation: sb-slide-right-${this.uid} ${this.speed} linear infinite;
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
        `;

        // 顶部光斑（向左滑）
        this.topLayer = document.createElement('div');
        this.topLayer.style.cssText = `
            position: absolute;
            top: -11px;
            left: -250%;
            width: 300%;
            height: 50%;
            opacity: 0.7;
            background: radial-gradient(circle, ${this.color}, transparent 10%);
            animation: sb-slide-left-${this.uid} ${this.speed} linear infinite;
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
        `;

        // 内容层
        this.contentWrap = document.createElement('div');
        this.contentWrap.style.cssText = `
            position: relative;
            z-index: 1;
            background: linear-gradient(180deg, #000, #1a1a1a);
            border: 1px solid #333;
            color: white;
            text-align: center;
            border-radius: ${this.borderRadius - this.thickness}px;
            padding: 16px 26px;
            box-sizing: border-box;
            width: 100%;
            height: 100%;
        `;

        // 移动原内容到 contentWrap
        const children = Array.from(el.childNodes);
        children.forEach(c => this.contentWrap.appendChild(c));

        el.appendChild(this.bottomLayer);
        el.appendChild(this.topLayer);
        el.appendChild(this.contentWrap);
    }

    destroy() {
        if (this.contentWrap) {
            const children = Array.from(this.contentWrap.childNodes);
            children.forEach(c => this.element.appendChild(c));
            this.contentWrap.remove();
        }
        if (this.bottomLayer) this.bottomLayer.remove();
        if (this.topLayer) this.topLayer.remove();
    }
}
