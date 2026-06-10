/**
 * ClickSpark - 点击迸发星光
 * 核心技术：基于 React Bits 研究
 * - 点击时从点击位置向外发射 N 条放射线段
 * - 每条线段从 sparkRadius 距离向外延伸到 sparkRadius + sparkSize
 * - 缓动函数控制扩散和淡出
 */

class ClickSpark {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.sparkColor = options.sparkColor || '#ffffff';
        this.sparkSize = options.sparkSize ?? 10;
        this.sparkRadius = options.sparkRadius ?? 15;
        this.sparkCount = options.sparkCount ?? 8;
        this.duration = options.duration ?? 400;
        this.easing = options.easing || 'ease-out';
        this.extraScale = options.extraScale ?? 1.0;

        this.sparks = [];
        this.init();
    }

    easeFunc(t) {
        switch (this.easing) {
            case 'linear': return t;
            case 'ease-in': return t * t;
            case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            default: return t * (2 - t); // ease-out
        }
    }

    init() {
        const isBody = this.container === document.body;
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: ${isBody ? 'fixed' : 'absolute'};
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        if (!isBody && getComputedStyle(this.container).position === 'static') {
            this.container.style.position = 'relative';
        }
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);

        this.clickHandler = (e) => this.handleClick(e);
        const target = isBody ? window : this.container;
        target.addEventListener('click', this.clickHandler);

        this.animate();
    }

    resize() {
        const isBody = this.container === document.body;
        const w = isBody ? window.innerWidth : this.container.offsetWidth;
        const h = isBody ? window.innerHeight : this.container.offsetHeight;
        this.canvas.width = w;
        this.canvas.height = h;
    }

    handleClick(e) {
        let x, y;
        if (this.container === document.body) {
            x = e.clientX; y = e.clientY;
        } else {
            const rect = this.container.getBoundingClientRect();
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        const now = performance.now();
        for (let i = 0; i < this.sparkCount; i++) {
            this.sparks.push({
                x, y,
                angle: (Math.PI * 2 * i) / this.sparkCount,
                startTime: now
            });
        }
    }

    animate() {
        const ctx = this.ctx;
        const now = performance.now();

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.sparks = this.sparks.filter(spark => {
            const elapsed = now - spark.startTime;
            if (elapsed >= this.duration) return false;

            const progress = elapsed / this.duration;
            const eased = this.easeFunc(progress);

            // 距离从 sparkRadius 向外扩散
            const distance = eased * this.sparkRadius * this.extraScale;
            // 线段长度先扩张后收缩
            const lineLen = this.sparkSize * (1 - eased);

            const x1 = spark.x + distance * Math.cos(spark.angle);
            const y1 = spark.y + distance * Math.sin(spark.angle);
            const x2 = spark.x + (distance + lineLen) * Math.cos(spark.angle);
            const y2 = spark.y + (distance + lineLen) * Math.sin(spark.angle);

            ctx.strokeStyle = this.sparkColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            return true;
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.resizeHandler);
        const target = this.container === document.body ? window : this.container;
        target.removeEventListener('click', this.clickHandler);
        this.canvas.remove();
    }
}
