/**
 * FluidGlass - 流体玻璃透镜
 * 原创实现思路（原版用 Three.js MeshTransmissionMaterial 物理玻璃）
 * - SVG turbulence + displacement filter 模拟折射变形
 * - backdrop-filter blur + saturate 增强玻璃质感
 * - 鼠标速度产生形变
 * - 多层高光、边缘光增强 3D 玻璃感
 */

class FluidGlass {
    constructor(options = {}) {
        this.container = options.container;
        this.size = options.size ?? 140;
        this.distortion = options.distortion ?? 1.0;     // 折射强度
        this.blurAmount = options.blurAmount ?? 4;        // 后景模糊
        this.saturation = options.saturation ?? 200;      // 饱和度增强
        this.chromaticAberration = options.chromaticAberration ?? 1.0; // 色散

        this.uid = Math.random().toString(36).substr(2, 9);
        this.targetX = 0; this.targetY = 0;
        this.x = 0; this.y = 0;
        this.scale = 1;
        this.targetScale = 1;
        this.lastX = 0; this.lastY = 0;
        this.velocityX = 0; this.velocityY = 0;
        this.visible = false;

        this.init();
        this.animate();
    }

    init() {
        const c = this.container;
        if (getComputedStyle(c).position === 'static') {
            c.style.position = 'relative';
        }

        // SVG 滤镜（湍流位移 + 色散）
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.id = 'fluid-svg-' + this.uid;
        svg.innerHTML = `
            <defs>
                <filter id="fg-distort-${this.uid}" x="-30%" y="-30%" width="160%" height="160%">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.012 0.012"
                        numOctaves="2"
                        seed="3"
                        result="turb"/>
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="turb"
                        scale="${30 * this.distortion}"
                        xChannelSelector="R"
                        yChannelSelector="G"/>
                </filter>
            </defs>
        `;
        c.appendChild(svg);
        this.svg = svg;

        // 透镜
        this.lens = document.createElement('div');
        this.lens.style.cssText = `
            position: absolute;
            width: ${this.size}px;
            height: ${this.size}px;
            border-radius: 50%;
            backdrop-filter:
                blur(${this.blurAmount}px)
                saturate(${this.saturation}%)
                url(#fg-distort-${this.uid});
            -webkit-backdrop-filter:
                blur(${this.blurAmount}px)
                saturate(${this.saturation}%);
            background:
                radial-gradient(
                    circle at 30% 30%,
                    rgba(255,255,255,0.30),
                    rgba(255,255,255,0.06) 45%,
                    rgba(255,255,255,0) 75%
                );
            border: 1px solid rgba(255,255,255,0.35);
            box-shadow:
                inset 0 0 30px rgba(255,255,255,0.15),
                inset 0 6px 24px rgba(255,255,255,0.20),
                inset 0 -6px 24px rgba(80,120,255,0.10),
                0 12px 36px rgba(0,0,0,0.25);
            opacity: 0;
            pointer-events: none;
            transform-origin: center;
            transition: opacity 0.25s;
            z-index: 100;
            will-change: transform, left, top;
        `;

        // 主高光
        const hi = document.createElement('div');
        hi.style.cssText = `
            position: absolute;
            top: 12%;
            left: 22%;
            width: 32%;
            height: 22%;
            background: radial-gradient(ellipse, rgba(255,255,255,0.65), rgba(255,255,255,0));
            border-radius: 50%;
            filter: blur(2px);
        `;
        this.lens.appendChild(hi);

        // 边缘色散光（彩虹镶边模拟色散）
        const rim = document.createElement('div');
        rim.style.cssText = `
            position: absolute;
            inset: -1px;
            border-radius: 50%;
            background: conic-gradient(
                from 0deg,
                rgba(255, 80, 80, ${0.15 * this.chromaticAberration}),
                rgba(80, 255, 200, ${0.15 * this.chromaticAberration}),
                rgba(80, 120, 255, ${0.15 * this.chromaticAberration}),
                rgba(255, 80, 80, ${0.15 * this.chromaticAberration})
            );
            -webkit-mask:
                linear-gradient(#000 0 0) content-box,
                linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            padding: 1px;
            mix-blend-mode: screen;
        `;
        this.lens.appendChild(rim);

        c.appendChild(this.lens);

        // 事件
        this.moveHandler = (e) => {
            const r = c.getBoundingClientRect();
            this.targetX = e.clientX - r.left;
            this.targetY = e.clientY - r.top;
            if (!this.visible) {
                this.visible = true;
                this.lens.style.opacity = '1';
                this.x = this.targetX;
                this.y = this.targetY;
                this.lastX = this.targetX;
                this.lastY = this.targetY;
            }
        };
        this.leaveHandler = () => {
            this.visible = false;
            this.lens.style.opacity = '0';
        };
        this.downHandler = () => { this.targetScale = 1.25; };
        this.upHandler = () => { this.targetScale = 1; };

        c.addEventListener('mousemove', this.moveHandler);
        c.addEventListener('mouseleave', this.leaveHandler);
        c.addEventListener('mousedown', this.downHandler);
        c.addEventListener('mouseup', this.upHandler);
    }

    animate() {
        // 平滑跟随
        const ease = 0.18;
        this.x += (this.targetX - this.x) * ease;
        this.y += (this.targetY - this.y) * ease;
        this.scale += (this.targetScale - this.scale) * 0.2;

        // 速度计算
        this.velocityX = this.x - this.lastX;
        this.velocityY = this.y - this.lastY;
        this.lastX = this.x;
        this.lastY = this.y;

        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);

        // 形变（速度方向拉长）
        const stretch = 1 + Math.min(speed / 80, 0.35);
        const squeeze = 1 - Math.min(speed / 160, 0.15);
        const angle = speed > 0.1 ? Math.atan2(this.velocityY, this.velocityX) * 180 / Math.PI : 0;

        this.lens.style.left = (this.x - this.size / 2) + 'px';
        this.lens.style.top = (this.y - this.size / 2) + 'px';
        this.lens.style.transform =
            `rotate(${angle}deg) scale(${this.scale * stretch}, ${this.scale * squeeze}) rotate(${-angle}deg)`;

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.container.removeEventListener('mousemove', this.moveHandler);
        this.container.removeEventListener('mouseleave', this.leaveHandler);
        this.container.removeEventListener('mousedown', this.downHandler);
        this.container.removeEventListener('mouseup', this.upHandler);
        this.lens.remove();
        if (this.svg) this.svg.remove();
    }
}
