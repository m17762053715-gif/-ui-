/**
 * Prism - 棱镜光谱
 * 核心技术：基于 React Bits 研究
 * - SDF 光线步进（ray marching）渲染棱锥形状
 * - sin 函数生成彩虹色环
 * - tanh 函数压缩高光
 * - Bloom + Glow 效果
 */

class Prism {
    constructor(options = {}) {
        this.container = options.container;
        this.height = options.height || 3.5;
        this.baseWidth = options.baseWidth || 5.5;
        this.glow = options.glow || 1.0;
        this.bloom = options.bloom || 1.0;
        this.scale = options.scale || 3.6;
        this.colorFreq = options.colorFreq || 1.0;
        this.hueShift = options.hueShift || 0;
        this.noise = options.noise || 0.5;
        this.timeScale = options.timeScale || 0.5;
        this.useWobble = options.useWobble !== false;

        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'width:100%;height:100%;display:block;';
        this.gl = this.canvas.getContext('webgl');
        if (!this.gl) {
            console.error('WebGL 不支持');
            return;
        }
        this.container.appendChild(this.canvas);

        this.init();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.startTime = performance.now();
        this.animate();
    }

    init() {
        const gl = this.gl;

        const vsSource = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        // 自己写的 ray marching 着色器，使用八面体 SDF + 色相旋转
        const fsSource = `
            precision highp float;

            uniform vec2 uRes;
            uniform float uTime;
            uniform float uHeight;
            uniform float uBaseHalf;
            uniform float uGlow;
            uniform float uBloom;
            uniform float uColorFreq;
            uniform float uHueShift;
            uniform float uNoise;
            uniform float uTimeScale;
            uniform float uUseWobble;
            uniform float uPxScale;

            // tanh 近似（WebGL 1.0 没有内置 tanh）
            vec4 vtanh(vec4 x) {
                vec4 e = exp(2.0 * x);
                return (e - 1.0) / (e + 1.0);
            }

            // 简单伪随机
            float rnd(vec2 co) {
                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
            }

            // 八面体 SDF（各向异性）
            float sdOcta(vec3 p) {
                vec3 q = vec3(abs(p.x) / uBaseHalf, abs(p.y) / uHeight, abs(p.z) / uBaseHalf);
                float minAxis = min(uBaseHalf, min(uHeight, uBaseHalf));
                return (q.x + q.y + q.z - 1.0) * minAxis * 0.5773502;
            }

            // 上半棱锥 = 八面体 ∩ 上半空间
            float sdPyramid(vec3 p) {
                float oct = sdOcta(p);
                float upper = -p.y;
                return max(oct, upper);
            }

            // 色相旋转矩阵
            mat3 hueRot(float a) {
                float c = cos(a), s = sin(a);
                mat3 W = mat3(0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114);
                mat3 U = mat3(0.701, -0.587, -0.114, -0.299, 0.413, -0.114, -0.300, -0.588, 0.886);
                mat3 V = mat3(0.168, -0.331, 0.500, 0.328, 0.035, -0.500, -0.497, 0.296, 0.201);
                return W + U * c + V * s;
            }

            // 自动旋转矩阵（绕 Y 和 X 缓慢旋转）
            mat3 autoRot(float t) {
                float ay = t * 0.3;
                float ax = sin(t * 0.4) * 0.4;
                float cy = cos(ay), sy = sin(ay);
                float cx = cos(ax), sx = sin(ax);
                mat3 ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
                mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
                return rx * ry;
            }

            void main() {
                vec2 f = (gl_FragCoord.xy - 0.5 * uRes.xy) * uPxScale;

                float z = 5.0;
                float d = 0.0;
                vec4 o = vec4(0.0);
                vec3 p;

                // base wobble (xz 平面晃动)
                mat2 wob = mat2(1.0, 0.0, 0.0, 1.0);
                if (uUseWobble > 0.5) {
                    float t = uTime * uTimeScale;
                    wob = mat2(cos(t), cos(t + 33.0), cos(t + 11.0), cos(t));
                }

                mat3 R = autoRot(uTime * uTimeScale);

                // ray marching 累积彩色光
                for (int i = 0; i < 80; i++) {
                    p = vec3(f, z);
                    p.xz = p.xz * wob;
                    p = R * p;
                    d = 0.1 + 0.2 * abs(sdPyramid(p));
                    z -= d;
                    // 沿光线累积彩色波纹
                    o += (sin((p.y + z) * uColorFreq + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
                }

                // tanh 压缩高光
                o = vtanh(o * o * (uGlow * uBloom) / 1e5);

                vec3 col = o.rgb;
                // 色相旋转
                col = hueRot(uHueShift) * col;
                // 噪点
                float n = rnd(gl_FragCoord.xy + vec2(uTime));
                col += (n - 0.5) * uNoise * 0.05;

                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error('Prism shader:', gl.getShaderInfoLog(s));
            }
            return s;
        };

        const vs = compile(gl.VERTEX_SHADER, vsSource);
        const fs = compile(gl.FRAGMENT_SHADER, fsSource);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        this.posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        this.u = {
            uRes: gl.getUniformLocation(this.program, 'uRes'),
            uTime: gl.getUniformLocation(this.program, 'uTime'),
            uHeight: gl.getUniformLocation(this.program, 'uHeight'),
            uBaseHalf: gl.getUniformLocation(this.program, 'uBaseHalf'),
            uGlow: gl.getUniformLocation(this.program, 'uGlow'),
            uBloom: gl.getUniformLocation(this.program, 'uBloom'),
            uColorFreq: gl.getUniformLocation(this.program, 'uColorFreq'),
            uHueShift: gl.getUniformLocation(this.program, 'uHueShift'),
            uNoise: gl.getUniformLocation(this.program, 'uNoise'),
            uTimeScale: gl.getUniformLocation(this.program, 'uTimeScale'),
            uUseWobble: gl.getUniformLocation(this.program, 'uUseWobble'),
            uPxScale: gl.getUniformLocation(this.program, 'uPxScale')
        };
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    animate() {
        const gl = this.gl;
        const t = (performance.now() - this.startTime) / 1000;

        gl.useProgram(this.program);
        const posLoc = gl.getAttribLocation(this.program, 'position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const minDim = Math.min(this.canvas.width, this.canvas.height);
        const pxScale = (this.scale * 2.0) / minDim;

        gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.u.uTime, t);
        gl.uniform1f(this.u.uHeight, this.height);
        gl.uniform1f(this.u.uBaseHalf, this.baseWidth / 2);
        gl.uniform1f(this.u.uGlow, this.glow);
        gl.uniform1f(this.u.uBloom, this.bloom);
        gl.uniform1f(this.u.uColorFreq, this.colorFreq);
        gl.uniform1f(this.u.uHueShift, this.hueShift);
        gl.uniform1f(this.u.uNoise, this.noise);
        gl.uniform1f(this.u.uTimeScale, this.timeScale);
        gl.uniform1f(this.u.uUseWobble, this.useWobble ? 1.0 : 0.0);
        gl.uniform1f(this.u.uPxScale, pxScale);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.canvas.remove();
    }
}
