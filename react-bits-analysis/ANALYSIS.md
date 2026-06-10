# React Bits 组件分析报告

## 核心发现

### 1. Galaxy（星系）
**文件:** galaxy.jsx (9840 字节)
**技术栈:** WebGL + GLSL 着色器 + OGL 库

**核心算法:**
- Hash 函数生成伪随机星星分布
- 多层深度系统（4 层，NUM_LAYER = 4.0）
- 柏林噪声不是核心，而是简单的 Hash 函数
- 星星射线效果：通过 `uv.x * uv.y * 1000.0` 创建十字射线
- HSV 到 RGB 颜色转换
- 鼠标排斥：距离场计算 + 力的叠加
- 旋转：通过旋转矩阵实现自动旋转

**关键参数:**
- starSpeed: 星星移动速度
- density: 密度（影响缩放）
- hueShift: 色调偏移
- glowIntensity: 发光强度
- mouseRepulsion: 鼠标排斥开关
- twinkleIntensity: 闪烁强度

### 2. Aurora（极光）
**文件:** aurora.jsx (5642 字节)
**技术栈:** WebGL + GLSL 着色器（使用 WebGL 2.0，#version 300 es）

**核心算法:**
- **Simplex Noise（单纯形噪声）** - 这是关键！
- 颜色渐变停止点系统（3 个颜色停止点）
- `exp(height)` 指数函数创造柔和过渡
- `smoothstep` 实现平滑的 alpha 渐变
- 混合模式：`gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)`

**数学公式:**
```glsl
// 高度计算
float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
height = exp(height);  // 指数让曲线更柔和
height = (uv.y * 2.0 - height + 0.2);

// Alpha 计算
float intensity = 0.6 * height;
float auroraAlpha = smoothstep(midPoint - blend * 0.5, midPoint + blend * 0.5, intensity);
```

**关键参数:**
- colorStops: 3 个颜色数组
- amplitude: 振幅（影响极光高度）
- blend: 混合强度（控制边缘柔和度）

### 3. Particles（粒子）
**文件:** particles.jsx (6757 字节)
**技术栈:** WebGL + 3D Camera + OGL 库

**核心算法:**
- **3D 粒子系统** - 使用 Camera 和透视投影
- 球形分布：通过循环生成单位球内的随机点
- 正弦波动画：`sin(t * random.z + 6.28 * random.w)`
- gl_PointSize 根据深度变化（近大远小）
- 圆形粒子：通过 `length(uv - vec2(0.5))` 判断是否在圆内

**顶点着色器核心:**
```glsl
// 正弦波移动
mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

// 透视大小
gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
```

## 核心技术总结

| 组件 | 核心技术 | 数学原理 | WebGL 版本 |
|------|---------|---------|-----------|
| Galaxy | Hash 函数 + 距离场 | 射线、旋转矩阵、HSV 转换 | 1.0 |
| Aurora | Simplex Noise | 指数函数、smoothstep | 2.0 (#version 300 es) |
| Particles | 3D 透视相机 | 正弦波、透视投影 | 1.0 |

## 我们的实现策略

### 阶段 1：完全移植（理解为主）
1. **Galaxy** - 已完成 ✅（galaxy-pure.html）
2. **Aurora** - 需要实现 Simplex Noise
3. **Particles** - 需要实现 3D 相机系统

### 阶段 2：优化改进
1. 去掉 OGL 依赖，改用纯 WebGL
2. 添加性能优化（降低着色器复杂度）
3. 增加更多可定制参数

### 阶段 3：创新扩展
1. 组合效果（Galaxy + Aurora）
2. 音频响应
3. 触摸交互（移动端）

## 关键发现

❌ **我之前错误的地方:**
- 没有用 WebGL 着色器，而是用 Canvas 2D
- 没有真正的噪声函数
- 缺少数学精度

✅ **正确的做法:**
- 所有高级效果都基于 WebGL 着色器
- Simplex/Perlin Noise 是核心
- 数学函数（sin, exp, smoothstep）创造视觉魔法

## 下一步

让我基于这些真实实现，重写我们的组件库！
