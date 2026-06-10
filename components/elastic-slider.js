/**
 * ElasticSlider - 弹性滑块
 * 核心技术：基于 React Bits 研究
 * - decay 衰减函数：超出边界的拉伸量随距离衰减
 * - region 区域：left/middle/right，决定拉伸方向
 * - 释放时弹簧回弹 (bounce 0.5)
 * - hover 时整体放大 1.2x
 * - 图标按 overflow 量横向平移
 */

class ElasticSlider {
    constructor(options = {}) {
        this.container = options.container;
        this.startValue = options.startValue ?? 0;
        this.maxValue = options.maxValue ?? 100;
        this.value = options.value ?? options.defaultValue ?? 50;
        this.stepSize = options.stepSize ?? 1;
        this.isStepped = options.isStepped || false;
        this.color = options.color || '#ffffff';
        this.leftIcon = options.leftIcon || '🔉';
        this.rightIcon = options.rightIcon || '🔊';
        this.maxOverflow = options.maxOverflow ?? 50;
        this.onChange = options.onChange || (() => {});

        this.region = 'middle';     // left | middle | right
        this.overflow = 0;          // 当前实际拉伸量
        this.targetOverflow = 0;    // 目标拉伸量
        this.scale = 1;             // 整体缩放
        this.targetScale = 1;
        this.dragging = false;
        this.bouncing = false;

        this.init();
        this.animate();
    }

    // 衰减函数：value 越大，返回值增长越慢，趋近于 max
    decay(value, max) {
        if (value === 0) return 0;
        const entry = value / max;
        const sigmoid = 2 / (1 + Math.exp(-entry)) - 1;
        return sigmoid * max;
    }

    init() {
        this.wrapper = document.createElement('div');
        this.wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            user-select: none;
            width: 100%;
            padding: 12px 0;
            touch-action: none;
        `;

        // slider 行
        this.row = document.createElement('div');
        this.row.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            transform-origin: center;
            transition: opacity 0.25s;
            opacity: 0.7;
        `;

        // 左图标
        this.leftEl = document.createElement('span');
        this.leftEl.textContent = this.leftIcon;
        this.leftEl.style.cssText = `
            font-size: 22px;
            color: rgba(255,255,255,0.6);
            transition: transform 0.15s;
            flex-shrink: 0;
        `;

        // 滑动区域容器
        this.sliderArea = document.createElement('div');
        this.sliderArea.style.cssText = `
            position: relative;
            flex: 1;
            height: 32px;
            display: flex;
            align-items: center;
            cursor: grab;
        `;

        // track
        this.track = document.createElement('div');
        this.track.style.cssText = `
            position: relative;
            width: 100%;
            height: 6px;
            background: rgba(128, 128, 128, 0.4);
            border-radius: 3px;
            overflow: visible;
            transform-origin: center;
            transition: height 0.2s;
        `;

        // 填充
        this.fill = document.createElement('div');
        this.fill.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: ${this.color};
            border-radius: 3px;
        `;
        this.track.appendChild(this.fill);
        this.sliderArea.appendChild(this.track);

        // 右图标
        this.rightEl = document.createElement('span');
        this.rightEl.textContent = this.rightIcon;
        this.rightEl.style.cssText = `
            font-size: 22px;
            color: rgba(255,255,255,0.6);
            transition: transform 0.15s;
            flex-shrink: 0;
        `;

        this.row.appendChild(this.leftEl);
        this.row.appendChild(this.sliderArea);
        this.row.appendChild(this.rightEl);

        // 数值显示
        this.valueLabel = document.createElement('div');
        this.valueLabel.style.cssText = `
            font-size: 11px;
            color: rgba(255,255,255,0.5);
            font-family: monospace;
            letter-spacing: 1px;
        `;

        this.wrapper.appendChild(this.row);
        this.wrapper.appendChild(this.valueLabel);
        this.container.appendChild(this.wrapper);

        // 事件
        this.row.addEventListener('mouseenter', () => { this.targetScale = 1.2; this.row.style.opacity = '1'; });
        this.row.addEventListener('mouseleave', () => {
            if (!this.dragging) { this.targetScale = 1; this.row.style.opacity = '0.7'; }
        });

        this.sliderArea.addEventListener('pointerdown', (e) => this.onDown(e));
        document.addEventListener('pointermove', (e) => this.onMove(e));
        document.addEventListener('pointerup', () => this.onUp());

        this.updateUI();
    }

    onDown(e) {
        this.dragging = true;
        this.bouncing = false;
        this.track.style.height = '10px';
        this.handleMove(e.clientX);
        try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch {}
    }

    onMove(e) {
        if (!this.dragging) return;
        this.handleMove(e.clientX);
    }

    onUp() {
        if (!this.dragging) return;
        this.dragging = false;
        this.track.style.height = '6px';
        // 启动弹簧回弹
        this.bouncing = true;
        this.targetOverflow = 0;
        // 检查鼠标是否还在 row 上
        if (!this.row.matches(':hover')) {
            this.targetScale = 1;
            this.row.style.opacity = '0.7';
        }
    }

    handleMove(clientX) {
        const rect = this.track.getBoundingClientRect();
        const left = rect.left;
        const right = rect.right;
        const width = rect.width;

        // 区域判断 + overflow 计算
        let raw = 0;
        if (clientX < left) {
            this.region = 'left';
            raw = left - clientX;
        } else if (clientX > right) {
            this.region = 'right';
            raw = clientX - right;
        } else {
            this.region = 'middle';
            raw = 0;
        }
        this.targetOverflow = this.decay(raw, this.maxOverflow);

        // 数值更新
        let newValue = this.startValue + ((clientX - left) / width) * (this.maxValue - this.startValue);
        if (this.isStepped) {
            newValue = Math.round(newValue / this.stepSize) * this.stepSize;
        }
        newValue = Math.min(Math.max(newValue, this.startValue), this.maxValue);
        if (newValue !== this.value) {
            this.value = newValue;
            this.onChange(this.value);
            this.updateUI();
        }
    }

    updateUI() {
        const ratio = (this.value - this.startValue) / (this.maxValue - this.startValue);
        this.fill.style.width = (ratio * 100) + '%';
        this.valueLabel.textContent = Math.round(this.value);
    }

    animate() {
        // 弹簧物理（接近目标 + 回弹）
        if (this.bouncing) {
            // 强弹簧回零
            this.overflow += (0 - this.overflow) * 0.18;
            // 微震荡
            if (Math.abs(this.overflow) < 0.5) {
                this.overflow = 0;
                this.bouncing = false;
            }
        } else {
            this.overflow += (this.targetOverflow - this.overflow) * 0.25;
        }

        // scale 平滑插值
        this.scale += (this.targetScale - this.scale) * 0.18;

        // 应用：track 横向拉伸 + 整体缩放
        const stretch = 1 + Math.abs(this.overflow) / 200;
        const trackOriginX = this.region === 'left' ? '100%' : (this.region === 'right' ? '0%' : '50%');
        this.track.style.transformOrigin = `${trackOriginX} 50%`;
        this.track.style.transform = `scaleX(${stretch})`;

        this.row.style.transform = `scale(${this.scale})`;

        // 图标响应（被推向远离方向）
        if (this.region === 'left') {
            this.leftEl.style.transform = `translateX(${-this.overflow / this.scale}px) scale(1.4)`;
            this.rightEl.style.transform = '';
        } else if (this.region === 'right') {
            this.rightEl.style.transform = `translateX(${this.overflow / this.scale}px) scale(1.4)`;
            this.leftEl.style.transform = '';
        } else {
            this.leftEl.style.transform = '';
            this.rightEl.style.transform = '';
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    setValue(v) {
        this.value = Math.min(Math.max(v, this.startValue), this.maxValue);
        this.updateUI();
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.wrapper.remove();
    }
}
