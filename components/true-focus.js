/**
 * TrueFocus - 文字聚焦效果
 * 技术：模糊滤镜 + 焦点框动画
 * 原创实现
 */

class TrueFocus {
    constructor(options = {}) {
        this.container = options.container;
        this.text = options.text || 'TRUE FOCUS';
        this.blurAmount = options.blurAmount || 5;
        this.borderColor = options.borderColor || '#00ffff';
        this.glowColor = options.glowColor || 'rgba(0, 255, 255, 0.6)';
        this.fontSize = options.fontSize || 48;
        this.cycleDuration = options.cycleDuration || 2000;
        this.manualMode = options.manualMode || false;

        this.activeIndex = 0;
        this.words = this.text.split(' ');

        this.init();
        if (!this.manualMode) {
            this.startAutoCycle();
        }
    }

    init() {
        this.wrapper = document.createElement('div');
        this.wrapper.style.cssText = `
            position: relative;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 16px;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;

        this.wordElements = [];

        this.words.forEach((word, idx) => {
            const span = document.createElement('span');
            span.textContent = word;
            span.style.cssText = `
                position: relative;
                font-size: ${this.fontSize}px;
                font-weight: 700;
                color: #fff;
                filter: blur(${this.blurAmount}px);
                transition: filter 0.4s ease;
                cursor: ${this.manualMode ? 'pointer' : 'default'};
                padding: 4px 8px;
            `;

            if (this.manualMode) {
                span.addEventListener('mouseenter', () => this.focusWord(idx));
            }

            this.wrapper.appendChild(span);
            this.wordElements.push(span);
        });

        // 焦点框
        this.focusBox = document.createElement('div');
        this.focusBox.style.cssText = `
            position: absolute;
            border: 2px solid ${this.borderColor};
            border-radius: 6px;
            pointer-events: none;
            box-shadow: 0 0 20px ${this.glowColor}, inset 0 0 20px ${this.glowColor};
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
        `;

        // 四角装饰
        ['top: -3px; left: -3px; border-top: 2px solid; border-left: 2px solid;',
         'top: -3px; right: -3px; border-top: 2px solid; border-right: 2px solid;',
         'bottom: -3px; left: -3px; border-bottom: 2px solid; border-left: 2px solid;',
         'bottom: -3px; right: -3px; border-bottom: 2px solid; border-right: 2px solid;'
        ].forEach(corner => {
            const c = document.createElement('div');
            c.style.cssText = `
                position: absolute;
                width: 12px;
                height: 12px;
                border-color: ${this.borderColor};
                ${corner}
            `;
            this.focusBox.appendChild(c);
        });

        this.wrapper.appendChild(this.focusBox);
        this.container.appendChild(this.wrapper);

        requestAnimationFrame(() => this.focusWord(0));
    }

    focusWord(idx) {
        this.activeIndex = idx;

        this.wordElements.forEach((el, i) => {
            el.style.filter = i === idx ? 'blur(0)' : `blur(${this.blurAmount}px)`;
        });

        const targetEl = this.wordElements[idx];
        const wrapperRect = this.wrapper.getBoundingClientRect();
        const elRect = targetEl.getBoundingClientRect();

        this.focusBox.style.opacity = '1';
        this.focusBox.style.left = (elRect.left - wrapperRect.left - 4) + 'px';
        this.focusBox.style.top = (elRect.top - wrapperRect.top - 4) + 'px';
        this.focusBox.style.width = (elRect.width + 8) + 'px';
        this.focusBox.style.height = (elRect.height + 8) + 'px';
    }

    startAutoCycle() {
        this.cycleTimer = setInterval(() => {
            const next = (this.activeIndex + 1) % this.words.length;
            this.focusWord(next);
        }, this.cycleDuration);
    }

    destroy() {
        if (this.cycleTimer) clearInterval(this.cycleTimer);
        this.wrapper.remove();
    }
}
