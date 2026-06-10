/**
 * Aurora - 极光效果
 * 基于 React Bits 原版算法
 * 核心技术：Simplex Noise + WebGL 2.0
 */

class Aurora {
    constructor(options = {}) {
        this.container = options.container;
        this.colorStops = options.colorStops || ['#5227FF', '#7cff67', '#5227FF'];
        this.amplitude = options.amplitude || 1.0;
        this.blend = options.blend || 0.5;
        this.speed = options.speed || 1.0;

        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl2');

        if (!this.gl) {
            console.error('WebGL 2.0 不支持');
            return;
        }

        this.container.appendChild(this.canvas);
        this.time = 0;

        this.init();
        this.resize();
        this.setupEvents();
        this.animate();
    }

    init() {
        const gl = this.gl;

        // 顶点着色器
        const vertexShaderSource = `#version 300 es
            in vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        // 片段着色器（完整 Simplex Noise）
        const fragmentShaderSource = `#version 300 es
            precision highp float;

            uniform float uTime;
            uniform float uAmplitude;
            uniform vec3 uColorStops[3];
            uniform vec2 uResolution;
            uniform float uBlend;

            out vec4 fragColor;

            vec3 permute(vec3 x) {
                return mod(((x * 34.0) + 1.0) * x, 289.0);
            }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);

                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
                m = m * m;
                m = m * m;

                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            struct ColorStop {
                vec3 color;
                float position;
            };

            #define COLOR_RAMP(colors, factor, finalColor) { \\
                int index = 0; \\
                for (int i = 0; i < 2; i++) { \\
                   ColorStop currentColor = colors[i]; \\
                   bool isInBetween = currentColor.position <= factor; \\
                   index = int(mix(float(index), float(i), float(isInBetween))); \\
                } \\
                ColorStop currentColor = colors[index]; \\
                ColorStop nextColor = colors[index + 1]; \\
                float range = nextColor.position - currentColor.position; \\
                float lerpFactor = (factor - currentColor.position) / range; \\
                finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / uResolution;

                ColorStop colors[3];
                colors[0] = ColorStop(uColorStops[0], 0.0);
                colors[1] = ColorStop(uColorStops[1], 0.5);
                colors[2] = ColorStop(uColorStops[2], 1.0);

                vec3 rampColor;
                COLOR_RAMP(colors, uv.x, rampColor);

                float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
                height = exp(height);
                height = (uv.y * 2.0 - height + 0.2);
                float intensity = 0.6 * height;

                float midPoint = 0.20;
                float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

                vec3 auroraColor = intensity * rampColor;

                fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
            }
        `;

        // 编译着色器
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
        }

        // 创建全屏三角形
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        this.positionBuffer = positionBuffer;

        // 获取 uniform 位置
        this.uniforms = {
            uTime: gl.getUniformLocation(this.program, 'uTime'),
            uAmplitude: gl.getUniformLocation(this.program, 'uAmplitude'),
            uColorStops: gl.getUniformLocation(this.program, 'uColorStops'),
            uResolution: gl.getUniformLocation(this.program, 'uResolution'),
            uBlend: gl.getUniformLocation(this.program, 'uBlend')
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

    hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        const bigint = parseInt(hex, 16);
        return [
            ((bigint >> 16) & 255) / 255,
            ((bigint >> 8) & 255) / 255,
            (bigint & 255) / 255
        ];
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resize());
    }

    draw() {
        const gl = this.gl;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.program);

        const positionLocation = gl.getAttribLocation(this.program, 'position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(this.uniforms.uTime, this.time * this.speed);
        gl.uniform1f(this.uniforms.uAmplitude, this.amplitude);
        gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.uBlend, this.blend);

        const colorStopsFlat = this.colorStops.flatMap(hex => this.hexToRgb(hex));
        gl.uniform3fv(this.uniforms.uColorStops, colorStopsFlat);

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
