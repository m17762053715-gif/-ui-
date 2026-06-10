/**
 * SideRays - 侧边光线
 * 核心算法：基于 React Bits 研究
 * - WebGL 着色器：从屏幕角落发射光束
 * - rayStrength：余弦角度 + 时间动画产生闪烁
 * - 距离衰减：远处光束变弱
 */

class SideRays {
    constructor(options = {}) {
        this.container = options.container;
        this.color1 = options.color1 || '#ffffff';
        this.color2 = options.color2 || '#a855f7';
        this.speed = options.speed || 2.5;
        this.intensity = options.intensity || 1.0;
        this.spread = options.spread || 1.0;
        this.tilt = options.tilt || 0;
        this.opacity = options.opacity || 1.0;
        this.origin = options.origin || 'top-right'; // top-left/top-right/bottom-left/bottom-right

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

        const fsSource = `
            precision highp float;
            uniform float uTime;
            uniform vec2 uResolution;
            uniform float uSpeed;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform float uIntensity;
            uniform float uSpread;
            uniform float uFlipX;
            uniform float uFlipY;
            uniform float uTilt;
            uniform float uOpacity;

            // 计算光束强度：基于角度和时间
            float rayStrength(vec2 src, vec2 dir, vec2 coord, float seedA, float seedB) {
                vec2 toCoord = coord - src;
                float cosA = dot(normalize(toCoord), dir);
                float a = 0.45 + 0.15 * sin(cosA * seedA + uTime * uSpeed);
                float b = 0.30 + 0.20 * cos(-cosA * seedB + uTime * uSpeed);
                float strength = clamp(a + b, 0.0, 1.0);
                // 距离衰减
                float falloff = clamp((uResolution.x - length(toCoord)) / uResolution.x, 0.5, 1.0);
                return strength * falloff;
            }

            void main() {
                vec2 fc = gl_FragCoord.xy;
                if (uFlipX > 0.5) fc.x = uResolution.x - fc.x;
                if (uFlipY > 0.5) fc.y = uResolution.y - fc.y;

                vec2 coord = vec2(fc.x, uResolution.y - fc.y);
                // 光源在屏幕外（右上角外侧）
                vec2 raySrc = vec2(uResolution.x * 1.1, -0.5 * uResolution.y);

                // 倾斜处理
                float tr = uTilt * 3.14159265 / 180.0;
                float cs = cos(tr), sn = sin(tr);
                vec2 rel = coord - raySrc;
                vec2 tilted = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + raySrc;

                // 两个略微不同的光束方向
                float half_s = uSpread * 0.275;
                vec2 dir1 = normalize(vec2(cos(0.785398 + half_s), sin(0.785398 + half_s)));
                vec2 dir2 = normalize(vec2(cos(0.785398 - half_s), sin(0.785398 - half_s)));

                vec3 c1 = uColor1 * rayStrength(raySrc, dir1, tilted, 36.2214, 21.11349);
                vec3 c2 = uColor2 * rayStrength(raySrc, dir2, tilted, 22.39910, 18.0234);

                // 顶部渐隐
                c1 *= 0.45 + 0.55 * pow(coord.y / uResolution.y, 0.4);
                c2 *= 0.55 + 0.45 * pow(coord.y / uResolution.y, 0.4);

                vec3 finalColor = (c1 + c2) * 0.5 * uIntensity;
                gl_FragColor = vec4(finalColor, uOpacity);
            }
        `;

        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error('shader error:', gl.getShaderInfoLog(s));
            }
            return s;
        };

        const vs = compile(gl.VERTEX_SHADER, vsSource);
        const fs = compile(gl.FRAGMENT_SHADER, fsSource);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        // 全屏三角形
        this.posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        this.u = {
            uTime: gl.getUniformLocation(this.program, 'uTime'),
            uResolution: gl.getUniformLocation(this.program, 'uResolution'),
            uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
            uColor1: gl.getUniformLocation(this.program, 'uColor1'),
            uColor2: gl.getUniformLocation(this.program, 'uColor2'),
            uIntensity: gl.getUniformLocation(this.program, 'uIntensity'),
            uSpread: gl.getUniformLocation(this.program, 'uSpread'),
            uFlipX: gl.getUniformLocation(this.program, 'uFlipX'),
            uFlipY: gl.getUniformLocation(this.program, 'uFlipY'),
            uTilt: gl.getUniformLocation(this.program, 'uTilt'),
            uOpacity: gl.getUniformLocation(this.program, 'uOpacity')
        };
    }

    hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        const i = parseInt(hex, 16);
        return [((i >> 16) & 255) / 255, ((i >> 8) & 255) / 255, (i & 255) / 255];
    }

    getFlip() {
        switch (this.origin) {
            case 'top-left': return [1, 0];
            case 'bottom-right': return [0, 1];
            case 'bottom-left': return [1, 1];
            default: return [0, 0]; // top-right
        }
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    animate() {
        const gl = this.gl;
        const t = (performance.now() - this.startTime) / 1000;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        const posLoc = gl.getAttribLocation(this.program, 'position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const c1 = this.hexToRgb(this.color1);
        const c2 = this.hexToRgb(this.color2);
        const flip = this.getFlip();

        gl.uniform1f(this.u.uTime, t);
        gl.uniform2f(this.u.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.u.uSpeed, this.speed);
        gl.uniform3fv(this.u.uColor1, c1);
        gl.uniform3fv(this.u.uColor2, c2);
        gl.uniform1f(this.u.uIntensity, this.intensity);
        gl.uniform1f(this.u.uSpread, this.spread);
        gl.uniform1f(this.u.uFlipX, flip[0]);
        gl.uniform1f(this.u.uFlipY, flip[1]);
        gl.uniform1f(this.u.uTilt, this.tilt);
        gl.uniform1f(this.u.uOpacity, this.opacity);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.canvas.remove();
    }
}
