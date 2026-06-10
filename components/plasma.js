/**
 * Plasma - 等离子体效果
 * 基于 React Bits 原版算法
 * 核心技术：WebGL 2.0 + 复杂着色器数学
 */

class Plasma {
    constructor(options = {}) {
        this.container = options.container;
        this.speed = options.speed || 1.0;
        this.scale = options.scale || 1.0;
        this.opacity = options.opacity || 1.0;
        this.color = options.color || null; // null = 彩色，'#xxxxxx' = 单色

        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl2');

        if (!this.gl) {
            console.error('WebGL 2.0 不支持');
            return;
        }

        this.container.appendChild(this.canvas);
        this.mouse = { x: 0, y: 0 };
        this.time = 0;

        this.init();
        this.resize();
        this.setupEvents();
        this.animate();
    }

    init() {
        const gl = this.gl;

        const vertexShaderSource = `#version 300 es
            precision highp float;
            in vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `#version 300 es
            precision highp float;
            uniform vec2 iResolution;
            uniform float iTime;
            uniform vec3 uCustomColor;
            uniform float uUseCustomColor;
            uniform float uSpeed;
            uniform float uScale;
            uniform float uOpacity;
            uniform vec2 uMouse;
            out vec4 fragColor;

            void mainImage(out vec4 o, vec2 C) {
                vec2 center = iResolution.xy * 0.5;
                C = (C - center) / uScale + center;

                vec2 mouseOffset = (uMouse - center) * 0.0002;
                C += mouseOffset * length(C - center);

                float i, d, z, T = iTime * uSpeed;
                vec3 O, p, S;

                for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w/d*o.xyz) {
                    p = z*normalize(vec3(C-.5*r,r.y));
                    p.z -= 4.;
                    S = p;
                    d = p.y-T;

                    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05);
                    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T));
                    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4;
                    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
                }

                o.xyz = tanh(O/1e4);
            }

            bool finite1(float x){ return !(isnan(x) || isinf(x)); }
            vec3 sanitize(vec3 c){
                return vec3(
                    finite1(c.r) ? c.r : 0.0,
                    finite1(c.g) ? c.g : 0.0,
                    finite1(c.b) ? c.b : 0.0
                );
            }

            void main() {
                vec4 o = vec4(0.0);
                mainImage(o, gl_FragCoord.xy);
                vec3 rgb = sanitize(o.rgb);

                float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
                vec3 customColor = intensity * uCustomColor;
                vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));

                float alpha = length(rgb) * uOpacity;
                fragColor = vec4(finalColor, alpha);
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
            iResolution: gl.getUniformLocation(this.program, 'iResolution'),
            iTime: gl.getUniformLocation(this.program, 'iTime'),
            uCustomColor: gl.getUniformLocation(this.program, 'uCustomColor'),
            uUseCustomColor: gl.getUniformLocation(this.program, 'uUseCustomColor'),
            uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
            uScale: gl.getUniformLocation(this.program, 'uScale'),
            uOpacity: gl.getUniformLocation(this.program, 'uOpacity'),
            uMouse: gl.getUniformLocation(this.program, 'uMouse')
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

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = this.canvas.height - (e.clientY - rect.top);
        });
    }

    draw() {
        const gl = this.gl;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.program);

        const positionLocation = gl.getAttribLocation(this.program, 'position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.iTime, this.time);
        gl.uniform1f(this.uniforms.uSpeed, this.speed);
        gl.uniform1f(this.uniforms.uScale, this.scale);
        gl.uniform1f(this.uniforms.uOpacity, this.opacity);
        gl.uniform2f(this.uniforms.uMouse, this.mouse.x, this.mouse.y);

        if (this.color) {
            const rgb = this.hexToRgb(this.color);
            gl.uniform3fv(this.uniforms.uCustomColor, rgb);
            gl.uniform1f(this.uniforms.uUseCustomColor, 1.0);
        } else {
            gl.uniform3fv(this.uniforms.uCustomColor, [1, 1, 1]);
            gl.uniform1f(this.uniforms.uUseCustomColor, 0.0);
        }

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
