/**
 * Galaxy - 星系效果
 * 基于 React Bits 原版算法
 * 核心技术：WebGL + Hash 函数 + 多层深度
 */

class Galaxy {
    constructor(options = {}) {
        this.container = options.container;
        this.density = options.density || 1.0;
        this.speed = options.speed || 1.0;
        this.hueShift = options.hueShift || 140;
        this.rotationSpeed = options.rotationSpeed || 0.1;
        this.mouseRepulsion = options.mouseRepulsion !== false;

        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl');

        if (!this.gl) {
            console.error('WebGL 不支持');
            return;
        }

        this.container.appendChild(this.canvas);
        this.mouse = { x: 0.5, y: 0.5, active: 0 };
        this.time = 0;

        this.init();
        this.resize();
        this.setupEvents();
        this.animate();
    }

    init() {
        const gl = this.gl;

        const vertexShaderSource = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision highp float;
            uniform float uTime;
            uniform vec2 uResolution;
            uniform vec2 uMouse;
            uniform float uMouseActive;
            uniform float uDensity;
            uniform float uHueShift;
            uniform float uSpeed;
            uniform float uRotationSpeed;

            #define NUM_LAYER 4.0
            #define STAR_COLOR_CUTOFF 0.2
            #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
            #define PERIOD 3.0

            float Hash21(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            float tri(float x) {
                return abs(fract(x) * 2.0 - 1.0);
            }

            float tris(float x) {
                float t = fract(x);
                return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
            }

            float trisn(float x) {
                float t = fract(x);
                return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
            }

            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            float Star(vec2 uv, float flare) {
                float d = length(uv);
                float m = 0.015 / d;
                float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
                m += rays * flare * 0.3;
                uv *= MAT45;
                rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
                m += rays * 0.3 * flare * 0.3;
                m *= smoothstep(1.0, 0.2, d);
                return m;
            }

            vec3 StarLayer(vec2 uv, float starSpeed) {
                vec3 col = vec3(0.0);
                vec2 gv = fract(uv) - 0.5;
                vec2 id = floor(uv);

                for (int y = -1; y <= 1; y++) {
                    for (int x = -1; x <= 1; x++) {
                        vec2 si = id + vec2(float(x), float(y));
                        float seed = Hash21(si);
                        float size = fract(seed * 345.32);
                        float glossLocal = tri(starSpeed / (PERIOD * seed + 1.0));
                        float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

                        float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
                        float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
                        float grn = min(red, blu) * seed;
                        vec3 base = vec3(red, grn, blu);

                        float hue = atan(base.g - base.r, base.b - base.r) / 6.28318 + 0.5;
                        hue = fract(hue + uHueShift / 360.0);
                        float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * 0.0;
                        float val = max(max(base.r, base.g), base.b);
                        base = hsv2rgb(vec3(hue, sat, val));

                        vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
                        float star = Star(gv - vec2(float(x), float(y)) - pad, flareSize);

                        float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
                        twinkle = mix(1.0, twinkle, 0.3);
                        star *= twinkle;

                        col += star * size * base;
                    }
                }
                return col;
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / uResolution.y;

                vec2 mousePosUV = (uMouse * uResolution - uResolution * 0.5) / uResolution.y;
                float mouseDist = length(uv - mousePosUV);
                vec2 repulsion = normalize(uv - mousePosUV) * (2.0 / (mouseDist + 0.1));
                uv += repulsion * 0.05 * uMouseActive;

                float autoRotAngle = uTime * uRotationSpeed;
                mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
                uv = autoRot * uv;

                vec3 col = vec3(0.0);
                float starSpeed = uTime * 0.05;

                for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
                    float depth = fract(i + starSpeed);
                    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
                    float fade = depth * smoothstep(1.0, 0.9, depth);
                    col += StarLayer(uv * scale + i * 453.32, starSpeed) * fade;
                }

                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        this.positionBuffer = positionBuffer;

        this.uniforms = {
            uTime: gl.getUniformLocation(this.program, 'uTime'),
            uResolution: gl.getUniformLocation(this.program, 'uResolution'),
            uMouse: gl.getUniformLocation(this.program, 'uMouse'),
            uMouseActive: gl.getUniformLocation(this.program, 'uMouseActive'),
            uDensity: gl.getUniformLocation(this.program, 'uDensity'),
            uHueShift: gl.getUniformLocation(this.program, 'uHueShift'),
            uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
            uRotationSpeed: gl.getUniformLocation(this.program, 'uRotationSpeed')
        };
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resize());

        if (this.mouseRepulsion) {
            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.x = (e.clientX - rect.left) / rect.width;
                this.mouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
                this.mouse.active = 1.0;
            });

            this.canvas.addEventListener('mouseleave', () => {
                this.mouse.active = 0.0;
            });
        }
    }

    draw() {
        const gl = this.gl;

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);

        const positionLocation = gl.getAttribLocation(this.program, 'position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(this.uniforms.uTime, this.time);
        gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.uniforms.uMouse, this.mouse.x, this.mouse.y);
        gl.uniform1f(this.uniforms.uMouseActive, this.mouse.active);
        gl.uniform1f(this.uniforms.uDensity, this.density);
        gl.uniform1f(this.uniforms.uHueShift, this.hueShift);
        gl.uniform1f(this.uniforms.uSpeed, this.speed);
        gl.uniform1f(this.uniforms.uRotationSpeed, this.rotationSpeed);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    animate() {
        this.time += 0.016;
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    destroy() {
        this.container.removeChild(this.canvas);
    }
}
