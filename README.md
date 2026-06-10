# VFX-Lib

> 基于 React Bits 源码研究的高质量 WebGL 视觉效果组件库

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-red.svg)](https://www.khronos.org/webgl/)
[![零依赖](https://img.shields.io/badge/dependencies-0-green.svg)](package.json)

[在线演示](https://your-demo-url.com) | [中文文档](README.md) | [English](README_EN.md)

## ✨ 特点

- ⚡ **高性能** - GPU 加速，流畅运行
- 📦 **零依赖** - 纯 JavaScript + WebGL
- 🎨 **5 个高质量组件** - 完全基于 React Bits 源码
- 🔬 **完整算法** - Simplex Noise、Perlin Noise、Ray Marching
- 📱 **响应式** - 支持桌面和移动端
- 🆓 **MIT 开源** - 可商用

## 🎬 在线演示

![Demo](https://via.placeholder.com/800x400/000000/FFFFFF?text=VFX-Lib+Demo)

打开 `demo/index.html` 查看所有组件效果。

## 📦 组件列表

### 1. Galaxy - 星系 ⭐⭐⭐⭐⭐
**技术：** WebGL + Hash 函数 + 多层深度

<img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Galaxy" width="300">

```javascript
new Galaxy({
  container: document.getElementById('container'),
  density: 1.0,
  speed: 1.0,
  rotationSpeed: 0.1
});
```

### 2. Aurora - 极光 ⭐⭐⭐⭐⭐
**技术：** WebGL 2.0 + Simplex Noise

<img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Aurora" width="300">

```javascript
new Aurora({
  container: document.getElementById('container'),
  colorStops: ['#5227FF', '#7cff67', '#5227FF'],
  amplitude: 1.0
});
```

### 3. Waves - 波浪 ⭐⭐⭐⭐
**技术：** Canvas 2D + Perlin Noise

<img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Waves" width="300">

```javascript
new Waves({
  container: document.getElementById('container'),
  lineColor: '#00ffff',
  waveSpeedX: 0.0125
});
```

### 4. Plasma - 等离子体 ⭐⭐⭐⭐
**技术：** WebGL 2.0 + Ray Marching

<img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Plasma" width="300">

```javascript
new Plasma({
  container: document.getElementById('container'),
  speed: 1.0,
  color: null // 彩色模式
});
```

### 5. Particles3D - 彩色3D粒子 ⭐⭐⭐⭐⭐
**技术：** WebGL + 3D 相机 + 透视投影

<img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Particles3D" width="300">

```javascript
new Particles3D({
  container: document.getElementById('container'),
  count: 200,
  colors: ['#ff0080', '#00ff80', '#0080ff'], // 彩色
  speed: 0.1
});
```

## 🚀 快速开始

### 1. 下载

```bash
git clone https://github.com/your-username/vfx-lib.git
cd vfx-lib
```

### 2. 使用

```html
<!-- 引入组件 -->
<script src="components/aurora.js"></script>

<!-- 创建容器 -->
<div id="bg" style="width: 100%; height: 100vh;"></div>

<script>
  const aurora = new Aurora({
    container: document.getElementById('bg'),
    colorStops: ['#5227FF', '#7cff67', '#5227FF']
  });
</script>
```

### 3. 查看演示

直接打开 `demo/index.html` 在浏览器中查看所有效果。

## 📊 性能

| 组件 | FPS (桌面) | GPU 占用 | 推荐场景 |
|------|-----------|---------|---------|
| Galaxy | 60+ | 中 | 背景、着陆页 |
| Aurora | 60+ | 低 | 背景、横幅 |
| Waves | 55+ | 低 (CPU) | 交互式背景 |
| Plasma | 50+ | 高 | 特效、动画 |
| Particles3D | 45+ | 高 | 英雄区、展示 |

详见 [PERFORMANCE.md](PERFORMANCE.md)

## 🔧 浏览器支持

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

需要 WebGL 1.0 支持（Aurora 需要 WebGL 2.0）

## 📖 文档

- [完整文档](README.md)
- [性能优化指南](PERFORMANCE.md)
- [API 参考](docs/API.md)

## 🎯 与 React Bits 的关系

本项目：
1. 研究 [React Bits](https://github.com/DavidHDev/react-bits) 源码
2. 理解算法和数学原理
3. 用纯 WebGL 重写（去掉 OGL 依赖）
4. 保留原版视觉质量和算法

**改动：** Particles3D 改为彩色粒子（原版为白色）

## 📜 许可证

MIT License

基于 React Bits 算法研究，代码完全重写。

## 🙏 致谢

- [React Bits](https://github.com/DavidHDev/react-bits) - 算法灵感来源
- WebGL 社区

## 👤 作者

**陈德宏**

- GitHub: [@your-username](https://github.com/your-username)
- 抖音: [@your-douyin](https://www.douyin.com)

---

⭐ 如果这个项目对你有帮助，请给一个 Star！
