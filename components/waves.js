/**
 * Waves - 波浪效果（完整复刻 React Bits 源码）
 * 核心技术：Perlin Noise + 物理模拟 + 鼠标交互
 */

class Waves {
    constructor(options = {}) {
        this.container = options.container;
        this.lineColor = options.lineColor || '#00ffff';
        this.waveSpeedX = options.waveSpeedX || 0.0125;
        this.waveSpeedY = options.waveSpeedY || 0.005;
        this.waveAmpX = options.waveAmpX || 32;
        this.waveAmpY = options.waveAmpY || 16;
        this.xGap = options.xGap || 10;
        this.yGap = options.yGap || 32;
        this.friction = options.friction || 0.925;
        this.tension = options.tension || 0.005;
        this.maxCursorMove = options.maxCursorMove || 100;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.noise = new PerlinNoiseComplete();
        this.lines = [];
        this.mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
        this.time = 0;

        this.resize();
        this.setupEvents();
        this.animate();
    }

    resize() {
        const bounds = this.container.getBoundingClientRect();
        this.canvas.width = bounds.width;
        this.canvas.height = bounds.height;
        this.initLines();
    }

    initLines() {
        this.lines = [];
        const width = this.canvas.width;
        const height = this.canvas.height;
        const oWidth = width + 200;
        const oHeight = height + 30;
        const totalLines = Math.ceil(oWidth / this.xGap);
        const totalPoints = Math.ceil(oHeight / this.yGap);
        const xStart = (width - this.xGap * totalLines) / 2;
        const yStart = (height - this.yGap * totalPoints) / 2;

        for (let i = 0; i <= totalLines; i++) {
            const pts = [];
            for (let j = 0; j <= totalPoints; j++) {
                pts.push({
                    x: xStart + this.xGap * i,
                    y: yStart + this.yGap * j,
                    wave: { x: 0, y: 0 },
                    cursor: { x: 0, y: 0, vx: 0, vy: 0 }
                });
            }
            this.lines.push(pts);
        }
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.mouse.set = true;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.set = false;
        });
    }

    movePoints() {
        // 更新鼠标速度
        if (this.mouse.set) {
            this.mouse.lx = this.mouse.sx;
            this.mouse.ly = this.mouse.sy;
            this.mouse.sx = this.mouse.x;
            this.mouse.sy = this.mouse.y;
        } else {
            this.mouse.sx += (this.mouse.x - this.mouse.sx) * 0.05;
            this.mouse.sy += (this.mouse.y - this.mouse.sy) * 0.05;
        }

        this.mouse.vx = this.mouse.sx - this.mouse.lx;
        this.mouse.vy = this.mouse.sy - this.mouse.ly;
        this.mouse.v = Math.sqrt(this.mouse.vx * this.mouse.vx + this.mouse.vy * this.mouse.vy);
        this.mouse.vs += (this.mouse.v - this.mouse.vs) * 0.2;
        this.mouse.a = Math.atan2(this.mouse.vy, this.mouse.vx);

        // 更新所有点
        this.lines.forEach(pts => {
            pts.forEach(p => {
                // Perlin Noise 波动
                const move = this.noise.perlin2(
                    (p.x + this.time * this.waveSpeedX) * 0.002,
                    (p.y + this.time * this.waveSpeedY) * 0.0015
                ) * 12;
                p.wave.x = Math.cos(move) * this.waveAmpX;
                p.wave.y = Math.sin(move) * this.waveAmpY;

                // 鼠标交互力
                const dx = p.x - this.mouse.sx;
                const dy = p.y - this.mouse.sy;
                const dist = Math.hypot(dx, dy);
                const l = Math.max(175, this.mouse.vs);

                if (dist < l) {
                    const s = 1 - dist / l;
                    const f = Math.cos(dist * 0.001) * s;
                    p.cursor.vx += Math.cos(this.mouse.a) * f * l * this.mouse.vs * 0.00065;
                    p.cursor.vy += Math.sin(this.mouse.a) * f * l * this.mouse.vs * 0.00065;
                }

                // 弹簧张力
                p.cursor.vx += (0 - p.cursor.x) * this.tension;
                p.cursor.vy += (0 - p.cursor.y) * this.tension;

                // 摩擦力
                p.cursor.vx *= this.friction;
                p.cursor.vy *= this.friction;

                // 更新位置
                p.cursor.x += p.cursor.vx;
                p.cursor.y += p.cursor.vy;

                // 限制最大移动距离
                const cursorDist = Math.hypot(p.cursor.x, p.cursor.y);
                if (cursorDist > this.maxCursorMove) {
                    const scale = this.maxCursorMove / cursorDist;
                    p.cursor.x *= scale;
                    p.cursor.y *= scale;
                }
            });
        });
    }

    draw() {
        // 使用透明黑色叠加创造拖尾效果
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = this.lineColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // 优化：使用单个 path 绘制所有线条
        this.ctx.beginPath();

        this.lines.forEach(pts => {
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                const px = p.x + p.wave.x + p.cursor.x;
                const py = p.y + p.wave.y + p.cursor.y;

                if (i === 0) {
                    this.ctx.moveTo(px, py);
                } else {
                    this.ctx.lineTo(px, py);
                }
            }
        });

        this.ctx.stroke();
    }

    animate() {
        this.time += 16;
        this.movePoints();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    destroy() {
        this.container.removeChild(this.canvas);
    }
}

// 完整的 Perlin Noise 实现（基于 React Bits 源码）
class Grad {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    dot2(x, y) {
        return this.x * x + this.y * y;
    }
}

class PerlinNoiseComplete {
    constructor(seed = Math.random()) {
        this.grad3 = [
            new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0),
            new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1),
            new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)
        ];

        this.p = [
            151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240,
            21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88,
            237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83,
            111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216,
            80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186,
            3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58,
            17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
            129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193,
            238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
            184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128,
            195, 78, 66, 215, 61, 156, 180
        ];

        this.perm = new Array(512);
        this.gradP = new Array(512);
        this.seed(seed);
    }

    seed(seed) {
        if (seed > 0 && seed < 1) seed *= 65536;
        seed = Math.floor(seed);
        if (seed < 256) seed |= seed << 8;
        for (let i = 0; i < 256; i++) {
            let v = i & 1 ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255);
            this.perm[i] = this.perm[i + 256] = v;
            this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
        }
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return (1 - t) * a + t * b;
    }

    perlin2(x, y) {
        let X = Math.floor(x);
        let Y = Math.floor(y);
        x -= X;
        y -= Y;
        X &= 255;
        Y &= 255;

        const n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
        const n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
        const n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
        const n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);

        const u = this.fade(x);
        return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y));
    }
}
