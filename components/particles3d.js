/**
 * Particles3D - 完全基于 React Bits 源码
 * 核心改动：默认使用彩色粒子
 */

class Particles3D {
    constructor(options = {}) {
        this.container = options.container;
        this.count = options.count || 200;
        this.spread = options.spread || 10;
        this.speed = options.speed || 0.1;
        this.baseSize = options.baseSize || 100;
        this.sizeRandomness = options.sizeRandomness || 1;
        this.cameraDistance = options.cameraDistance || 20;
        // 改成彩色默认值
        this.colors = options.colors || ['#ff0080', '#00ff80', '#0080ff', '#ff8000', '#8000ff', '#ffff00'];
        this.alphaParticles = options.alphaParticles !== false;
        this.disableRotation = options.disableRotation || false;
        this.moveParticlesOnHover = options.moveParticlesOnHover || false;
        this.particleHoverFactor = options.particleHoverFactor || 1;
        this.pixelRatio = window.devicePixelRatio || 1;

        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl');

        if (!this.gl) {
            console.error('WebGL 不支持');
            return;
        }

        this.container.appendChild(this.canvas);
        this.mouse = { x: 0, y: 0 };
        this.particlePosition = { x: 0, y: 0 };
        this.particleRotation = { x: 0, y: 0, z: 0 };
        this.elapsed = 0;
        this.lastTime = 0;
        this.animationId = null;

        this.init();
        this.resize();
        this.setupEvents();
        this.animate(performance.now());
    }

    init() {
        const gl = this.gl;

        // 完全按照 React Bits 的着色器
        const vertexShaderSource = `
            attribute vec3 position;
            attribute vec4 random;
            attribute vec3 color;

            uniform mat4 modelMatrix;
            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform float uTime;
            uniform float uSpread;
            uniform float uBaseSize;
            uniform float uSizeRandomness;

            varying vec4 vRandom;
            varying vec3 vColor;

            void main() {
                vRandom = random;
                vColor = color;

                vec3 pos = position * uSpread;
                pos.z *= 10.0;

                vec4 mPos = modelMatrix * vec4(pos, 1.0);
                float t = uTime;
                mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
                mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
                mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

                vec4 mvPos = viewMatrix * mPos;

                if (uSizeRandomness == 0.0) {
                    gl_PointSize = uBaseSize;
                } else {
                    gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
                }

                gl_Position = projectionMatrix * mvPos;
            }
        `;

        const fragmentShaderSource = `
            precision highp float;

            uniform float uTime;
            uniform float uAlphaParticles;
            varying vec4 vRandom;
            varying vec3 vColor;

            void main() {
                vec2 uv = gl_PointCoord.xy;
                float d = length(uv - vec2(0.5));

                if(uAlphaParticles < 0.5) {
                    if(d > 0.5) {
                        discard;
                    }
                    gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
                } else {
                    float circle = smoothstep(0.5, 0.4, d) * 0.8;
                    gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
                }
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

        // 生成粒子数据（完全按照源码）
        const positions = new Float32Array(this.count * 3);
        const randoms = new Float32Array(this.count * 4);
        const colors = new Float32Array(this.count * 3);

        for (let i = 0; i < this.count; i++) {
            let x, y, z, len;
            do {
                x = Math.random() * 2 - 1;
                y = Math.random() * 2 - 1;
                z = Math.random() * 2 - 1;
                len = x * x + y * y + z * z;
            } while (len > 1 || len === 0);

            const r = Math.cbrt(Math.random());
            positions[i * 3] = x * r;
            positions[i * 3 + 1] = y * r;
            positions[i * 3 + 2] = z * r;

            randoms[i * 4] = Math.random();
            randoms[i * 4 + 1] = Math.random();
            randoms[i * 4 + 2] = Math.random();
            randoms[i * 4 + 3] = Math.random();

            const colorIndex = Math.floor(Math.random() * this.colors.length);
            const rgb = this.hexToRgb(this.colors[colorIndex]);
            colors[i * 3] = rgb[0];
            colors[i * 3 + 1] = rgb[1];
            colors[i * 3 + 2] = rgb[2];
        }

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this.randomBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.randomBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, randoms, gl.STATIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

        this.uniforms = {
            modelMatrix: gl.getUniformLocation(this.program, 'modelMatrix'),
            viewMatrix: gl.getUniformLocation(this.program, 'viewMatrix'),
            projectionMatrix: gl.getUniformLocation(this.program, 'projectionMatrix'),
            uTime: gl.getUniformLocation(this.program, 'uTime'),
            uSpread: gl.getUniformLocation(this.program, 'uSpread'),
            uBaseSize: gl.getUniformLocation(this.program, 'uBaseSize'),
            uSizeRandomness: gl.getUniformLocation(this.program, 'uSizeRandomness'),
            uAlphaParticles: gl.getUniformLocation(this.program, 'uAlphaParticles')
        };

        this.attributes = {
            position: gl.getAttribLocation(this.program, 'position'),
            random: gl.getAttribLocation(this.program, 'random'),
            color: gl.getAttribLocation(this.program, 'color')
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
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const int = parseInt(hex, 16);
        return [
            ((int >> 16) & 255) / 255,
            ((int >> 8) & 255) / 255,
            (int & 255) / 255
        ];
    }

    createPerspectiveMatrix(fov, aspect, near, far) {
        const f = 1.0 / Math.tan((fov * Math.PI / 180) / 2);
        const rangeInv = 1 / (near - far);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ]);
    }

    createViewMatrix(x, y, z) {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            -x, -y, -z, 1
        ]);
    }

    // 完全按照 React Bits 的旋转矩阵组合
    createModelMatrix(rx, ry, rz, tx, ty) {
        const cx = Math.cos(rx), sx = Math.sin(rx);
        const cy = Math.cos(ry), sy = Math.sin(ry);
        const cz = Math.cos(rz), sz = Math.sin(rz);

        // 组合旋转矩阵 (ZYX 顺序) + 平移
        return new Float32Array([
            cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz, 0,
            -cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz, 0,
            sy, -sx * cy, cx * cy, 0,
            tx, ty, 0, 1
        ]);
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resize());

        if (this.moveParticlesOnHover) {
            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
            });
        }
    }

    draw() {
        const gl = this.gl;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);

        gl.useProgram(this.program);

        // 鼠标移动粒子（完全按照源码）
        if (this.moveParticlesOnHover) {
            this.particlePosition.x = -this.mouse.x * this.particleHoverFactor;
            this.particlePosition.y = -this.mouse.y * this.particleHoverFactor;
        } else {
            this.particlePosition.x = 0;
            this.particlePosition.y = 0;
        }

        // 旋转动画（完全按照源码）
        if (!this.disableRotation) {
            this.particleRotation.x = Math.sin(this.elapsed * 0.0002) * 0.1;
            this.particleRotation.y = Math.cos(this.elapsed * 0.0005) * 0.15;
            this.particleRotation.z += 0.01 * this.speed;
        }

        const aspect = this.canvas.width / this.canvas.height;
        const projectionMatrix = this.createPerspectiveMatrix(15, aspect, 0.1, 100);
        const viewMatrix = this.createViewMatrix(0, 0, -this.cameraDistance);
        const modelMatrix = this.createModelMatrix(
            this.particleRotation.x,
            this.particleRotation.y,
            this.particleRotation.z,
            this.particlePosition.x,
            this.particlePosition.y
        );

        gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, modelMatrix);
        gl.uniform1f(this.uniforms.uTime, this.elapsed * 0.001);
        gl.uniform1f(this.uniforms.uSpread, this.spread);
        gl.uniform1f(this.uniforms.uBaseSize, this.baseSize * this.pixelRatio);
        gl.uniform1f(this.uniforms.uSizeRandomness, this.sizeRandomness);
        gl.uniform1f(this.uniforms.uAlphaParticles, this.alphaParticles ? 1.0 : 0.0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.attributes.position);
        gl.vertexAttribPointer(this.attributes.position, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.randomBuffer);
        gl.enableVertexAttribArray(this.attributes.random);
        gl.vertexAttribPointer(this.attributes.random, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(this.attributes.color);
        gl.vertexAttribPointer(this.attributes.color, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.POINTS, 0, this.count);
    }

    animate(t) {
        // 第一次调用时初始化 lastTime
        if (!t) t = performance.now();
        if (this.lastTime === 0 || !this.lastTime) {
            this.lastTime = t;
        }

        this.animationId = requestAnimationFrame((t) => this.animate(t));

        const delta = t - this.lastTime;
        this.lastTime = t;
        this.elapsed += delta * this.speed;

        this.draw();
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.container.contains(this.canvas)) {
            this.container.removeChild(this.canvas);
        }
    }
}
