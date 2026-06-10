# 性能优化指南

## 🎯 目标性能指标

- **桌面端：** FPS ≥ 60
- **移动端：** FPS ≥ 30
- **低端设备：** FPS ≥ 24

## 📊 各组件性能特征

### Galaxy（WebGL）
- **性能：** ⭐⭐⭐⭐⭐ 优秀
- **GPU 占用：** 中等
- **优化要点：** 降低 `density` 参数

### Aurora（WebGL 2.0）
- **性能：** ⭐⭐⭐⭐⭐ 优秀
- **GPU 占用：** 低
- **优化要点：** 降低 `speed` 参数

### Waves（Canvas 2D）
- **性能：** ⭐⭐⭐⭐ 良好
- **CPU 占用：** 中等
- **优化要点：** 增大 `xGap` 和 `yGap`（减少点数）

### Plasma（WebGL 2.0）
- **性能：** ⭐⭐⭐⭐ 良好
- **GPU 占用：** 高（复杂着色器）
- **优化要点：** 降低 `speed` 和 `scale`

### Particles3D（WebGL）
- **性能：** ⭐⭐⭐ 一般
- **GPU 占用：** 高（透视计算）
- **优化要点：** 减少 `count`，降低 `speed`

## 🔧 常见问题解决

### 问题 1：Particles3D 有黑屏间隙

**原因：** 粒子运动幅度过大，周期性飞出视野

**解决方案：**
```javascript
new Particles3D({
  count: 500,        // 增加粒子数量填充空隙
  spread: 8,         // 减小扩散（默认 10）
  speed: 0.08,       // 降低速度（默认 0.1）
  baseSize: 120,     // 增大粒子（默认 100）
  cameraDistance: 18 // 拉近相机（默认 20）
});
```

### 问题 2：Waves 卡顿

**原因：** 网格点数过多，CPU 计算压力大

**解决方案：**
```javascript
new Waves({
  xGap: 15,  // 增大间距（默认 10）
  yGap: 40,  // 增大间距（默认 32）
  friction: 0.95, // 增加摩擦力
  tension: 0.003  // 降低张力
});
```

### 问题 3：多个组件同时运行卡顿

**原因：** WebGL 上下文数量限制

**解决方案：**
- 单页面最多 3 个 WebGL 组件
- 优先使用性能好的组件（Galaxy、Aurora）
- 使用 Canvas 2D 组件（Waves）作为补充

### 问题 4：移动端性能差

**解决方案：**
```javascript
// 检测设备类型
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
  // 移动端降级参数
  new Particles3D({
    count: 200,      // 减少数量
    speed: 0.05,     // 降低速度
    baseSize: 80     // 减小尺寸
  });
}
```

## 💡 最佳实践

### 1. 懒加载
```javascript
// 只在可见时初始化
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      initComponent();
    }
  });
});
```

### 2. 根据性能动态调整
```javascript
let fps = 0;
// FPS 监控代码...

if (fps < 30) {
  // 降低质量
  component.count = 200;
  component.speed = 0.05;
}
```

### 3. 使用 requestIdleCallback
```javascript
requestIdleCallback(() => {
  // 在浏览器空闲时初始化
  new Galaxy({ ... });
});
```

## 🎨 推荐组合

### 高性能组合（FPS > 60）
- Galaxy + Aurora
- Galaxy + Waves
- Aurora + Waves

### 中性能组合（FPS 40-60）
- Galaxy + Plasma
- Aurora + Particles3D
- Waves + Plasma

### 避免组合（FPS < 30）
- Plasma + Particles3D + Waves
- 3 个以上 WebGL 组件

## 📱 移动端推荐

- ✅ **推荐：** Galaxy、Aurora（性能最好）
- ⚠️ **谨慎：** Waves、Plasma
- ❌ **避免：** Particles3D（性能要求高）

---

**性能测试工具：**
- 打开 `demo/index.html` 查看右上角 FPS 监控
- 使用 `test-*.html` 文件进行单组件性能测试
