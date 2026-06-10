/**
 * TrueFocus - 文字聚焦
 * 核心算法：基于 React Bits 研究
 * - 一个独立的焦点框，跟随当前激活词移动
 * - 模糊滤镜淡入淡出
 * - 四角装饰元素
 * - 支持自动循环和手动 hover 模式
 */

class TrueFocus {
    constructor(options = {}) {
        this.container = options.container;
        this.sentence = options.sentence || options.text || 'True Focus';
        this.separator = options.separator || ' ';
        this.manualMode = options.manualMode || false;
        this.blurAmount = options.blurAmount ?? 5;
        this.borderColor = options.borderColor || '#22c55e';
        this.glowColor = options.glowColor || 'rgba(34, 197, 94, 0.6)';
        this.animationDuration = options.animationDuration || 0.5;
        this.pauseBetween = options.pauseBetween ?? 1;
        this.fontSize = options.fontSize || 48;

        this.words = this.sentence.split(this.separator);
        this.currentIndex = 0;
        this.lastActiveIndex = null;

        this.init();
    }

    init() {
        const c = this.container;
        if (getComputedStyle(c).position === 'static') {
            c.style.position = 'relative';
        }

        // wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.style.cssText = `
            position: relative;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            gap: 1em;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: 700;
            font-size: ${this.fontSize}px;
            color: #fff;
        `;

        // word spans
        this.wordEls = this.words.map((w, i) => {
            const span = document.createElement('span');
            span.textContent = w;
            span.style.cssText = `
                position: relative;
                display: inline-block;
                filter: blur(${this.blurAmount}px);
                transition: filter ${this.animationDuration}s ease;
                cursor: ${this.manualMode ? 'pointer' : 'default'};
            `;
            if (this.manualMode) {
                span.addEventListener('mouseenter', () => this.onEnter(i));
                span.addEventListener('mouseleave', () => this.onLeave());
            }
            this.wrapper.appendChild(span);
            return span;
        });

        // focus frame (4 corners only)
        this.frame = document.createElement('div');
        this.frame.style.cssText = `
            position: absolute;
            pointer-events: none;
            opacity: 0;
            transition: all ${this.animationDuration}s ease;
            box-sizing: border-box;
        `;

        const cornerSize = 0.25; // 25% of frame
        const cornerStyle = `
            position: absolute;
            width: ${cornerSize * 100}%;
            height: ${cornerSize * 100}%;
            border: 3px solid ${this.borderColor};
            filter: drop-shadow(0 0 4px ${this.glowColor});
        `;

        // 4 corners with only 2 sides each
        const corners = [
            { pos: 'top:-10px;left:-10px;', sides: 'border-right:none;border-bottom:none;border-radius:6px 0 0 0;' },
            { pos: 'top:-10px;right:-10px;', sides: 'border-left:none;border-bottom:none;border-radius:0 6px 0 0;' },
            { pos: 'bottom:-10px;left:-10px;', sides: 'border-right:none;border-top:none;border-radius:0 0 0 6px;' },
            { pos: 'bottom:-10px;right:-10px;', sides: 'border-left:none;border-top:none;border-radius:0 0 6px 0;' }
        ];

        corners.forEach(c => {
            const corner = document.createElement('span');
            corner.style.cssText = cornerStyle + c.pos + c.sides;
            this.frame.appendChild(corner);
        });

        this.wrapper.appendChild(this.frame);
        this.container.appendChild(this.wrapper);

        // 等待布局完成
        requestAnimationFrame(() => {
            this.updateFrame(0);
            if (!this.manualMode) {
                this.startAuto();
            }
        });
    }

    updateFrame(idx) {
        if (idx === null || idx < 0 || !this.wordEls[idx]) {
            this.frame.style.opacity = '0';
            return;
        }

        const wRect = this.wrapper.getBoundingClientRect();
        const eRect = this.wordEls[idx].getBoundingClientRect();

        const x = eRect.left - wRect.left - 6;
        const y = eRect.top - wRect.top - 6;
        const w = eRect.width + 12;
        const h = eRect.height + 12;

        this.frame.style.left = x + 'px';
        this.frame.style.top = y + 'px';
        this.frame.style.width = w + 'px';
        this.frame.style.height = h + 'px';
        this.frame.style.opacity = '1';

        // update word blur
        this.wordEls.forEach((el, i) => {
            el.style.filter = i === idx ? 'blur(0)' : `blur(${this.blurAmount}px)`;
        });

        this.currentIndex = idx;
    }

    onEnter(idx) {
        this.lastActiveIndex = idx;
        this.updateFrame(idx);
    }

    onLeave() {
        // 留在最后的位置
        this.updateFrame(this.lastActiveIndex);
    }

    startAuto() {
        const cycleMs = (this.animationDuration + this.pauseBetween) * 1000;
        this.timer = setInterval(() => {
            const next = (this.currentIndex + 1) % this.words.length;
            this.updateFrame(next);
        }, cycleMs);
    }

    destroy() {
        if (this.timer) clearInterval(this.timer);
        this.wrapper.remove();
    }
}
