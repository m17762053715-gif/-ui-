/**
 * ElasticSlider - 弹性滑块
 * 技术：拉伸感应 + 弹簧物理
 * 原创实现
 */

class ElasticSlider {
    constructor(options = {}) {
        this.container = options.container;
        this.min = options.min ?? 0;
        this.max = options.max ?? 100;
        this.value = options.value ?? 50;
        this.step = options.step ?? 1;
        this.color = options.color || '#667eea';
        this.onChange = options.onChange || (() => {});

        this.dragging = false;
        this.stretchOffset = 0;
        this.targetStretch = 0;

        this.init();
        this.animate();
    }

    init() {
        this.wrapper = document.createElement('div');
        this.wrapper.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 0;
            user-select: none;
            width: 100%;
        `;

        // 减号图标
        this.minIcon = document.createElement('span');
        this.minIcon.style.cssText = `
            color: rgba(255,255,255,0.6);
            font-size: 18px;
            transition: transform 0.2s;
        `;
        this.minIcon.textContent = '–';

        // 加号图标
        this.maxIcon = document.createElement('span');
        this.maxIcon.style.cssText = `
            color: rgba(255,255,255,0.6);
            font-size: 18px;
            transition: transform 0.2s;
        `;
        this.maxIcon.textContent = '+';

        // 滑块轨道
        this.track = document.createElement('div');
        this.track.style.cssText = `
            position: relative;
            flex: 1;
            height: 6px;
            background: rgba(255,255,255,0.15);
            border-radius: 3px;
            cursor: pointer;
            transition: height 0.2s, transform 0.2s;
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
            pointer-events: none;
        `;

        this.track.appendChild(this.fill);
        this.wrapper.appendChild(this.minIcon);
        this.wrapper.appendChild(this.track);
        this.wrapper.appendChild(this.maxIcon);
        this.container.appendChild(this.wrapper);

        // 事件
        this.track.addEventListener('mousedown', (e) => this.startDrag(e));
        this.track.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));

        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('touchmove', (e) => this.onDrag(e.touches[0]));

        document.addEventListener('mouseup', () => this.endDrag());
        document.addEventListener('touchend', () => this.endDrag());

        this.updateUI();
    }

    startDrag(e) {
        this.dragging = true;
        this.track.style.height = '10px';
        this.onDrag(e);
    }

    onDrag(e) {
        if (!this.dragging) return;

        const rect = this.track.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // 计算超出边界的拉伸量
        if (x < 0) {
            this.targetStretch = Math.max(x, -40);
        } else if (x > rect.width) {
            this.targetStretch = Math.min(x - rect.width, 40);
        } else {
            this.targetStretch = 0;
        }

        // 更新值
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        const rawValue = this.min + ratio * (this.max - this.min);
        const steppedValue = Math.round(rawValue / this.step) * this.step;

        if (steppedValue !== this.value) {
            this.value = steppedValue;
            this.updateUI();
            this.onChange(this.value);
        }
    }

    endDrag() {
        this.dragging = false;
        this.targetStretch = 0;
        this.track.style.height = '6px';
    }

    updateUI() {
        const ratio = (this.value - this.min) / (this.max - this.min);
        this.fill.style.width = (ratio * 100) + '%';
    }

    animate() {
        // 弹簧物理
        const spring = 0.2;
        const damping = 0.7;
        this.stretchOffset += (this.targetStretch - this.stretchOffset) * spring;
        this.stretchOffset *= damping + (1 - damping);

        // 应用拉伸变换
        if (Math.abs(this.stretchOffset) > 0.5) {
            const scaleX = 1 + Math.abs(this.stretchOffset) / 200;
            const translateX = this.stretchOffset * 0.3;
            this.track.style.transform = `translateX(${translateX}px) scaleX(${scaleX})`;

            // 图标也跟随移动
            if (this.stretchOffset < 0) {
                this.minIcon.style.transform = `translateX(${this.stretchOffset * 0.5}px)`;
                this.maxIcon.style.transform = '';
            } else {
                this.maxIcon.style.transform = `translateX(${this.stretchOffset * 0.5}px)`;
                this.minIcon.style.transform = '';
            }
        } else {
            this.track.style.transform = '';
            this.minIcon.style.transform = '';
            this.maxIcon.style.transform = '';
        }

        requestAnimationFrame(() => this.animate());
    }

    setValue(v) {
        this.value = Math.max(this.min, Math.min(this.max, v));
        this.updateUI();
    }

    destroy() {
        this.wrapper.remove();
    }
}
