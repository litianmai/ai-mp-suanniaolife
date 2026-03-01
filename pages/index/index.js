Page({
  data: {
    welcomeText: '导弹发射演示'
  },

  onLoad() {
    console.log('Index page loaded');
  },

  onReady() {
    console.log('onReady 执行');
    // 初始化 canvas
    this.initCanvas();
  },

  onShow() {
    console.log('页面显示');
  },

  onUnload() {
    // 清理动画
    if (this.animateTimer) {
      clearInterval(this.animateTimer);
    }
    if (this.canvas) {
      this.canvas = null;
    }
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#missileCanvas')
      .fields({
        node: true,
        size: true
      })
      .exec((res) => {
        if (res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);

          this.canvas = canvas;
          this.ctx = ctx;
          this.canvasWidth = res[0].width;
          this.canvasHeight = res[0].height;

          // 初始化导弹和粒子数组
          this.missiles = [];
          this.particles = [];
          this.expressions = [];

          console.log('Canvas 初始化成功:', this.canvasWidth, this.canvasHeight);

          // 开始动画循环
          this.startAnimation();
        }
      });
  },

  // 发射导弹
  fireMissile() {
    console.log('fireMissile 被调用', this.ctx, this.canvasWidth);

    if (!this.ctx || !this.canvasWidth) {
      console.log('Canvas 未初始化完成');
      wx.showToast({
        title: '画布加载中...',
        icon: 'none'
      });
      return;
    }

    // 发射点（底部中间）
    const startX = this.canvasWidth / 2;
    const startY = this.canvasHeight - 100;

    // 目标点（随机位置）
    const targetX = Math.random() * this.canvasWidth * 0.8 + this.canvasWidth * 0.1;
    const targetY = Math.random() * this.canvasHeight * 0.5 + this.canvasHeight * 0.1;

    // 计算角度
    const angle = Math.atan2(targetY - startY, targetX - startX);

    // 创建导弹
    this.missiles.push({
      x: startX,
      y: startY,
      targetX: targetX,
      targetY: targetY,
      angle: angle,
      speed: 8,
      length: 60,
      radius: 12,
      active: true
    });

    console.log('发射导弹！目标:', targetX, targetY);
  },

  // 创建爆炸粒子
  createExplosion(x, y) {
    const particleCount = 80;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = Math.random() * 8 + 2;
      const size = Math.random() * 8 + 4;
      const life = 60;

      // 爆炸颜色（橙红黄渐变）
      const colors = ['#ff4500', '#ff6347', '#ff8c00', '#ffa500', '#ffd700', '#ffff00'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        life: life,
        maxLife: life,
        color: color,
        gravity: 0.2
      });
    }

    // 添加冲击波
    this.expressions.push({
      x: x,
      y: y,
      radius: 10,
      maxRadius: 120,
      alpha: 1,
      lineWidth: 8
    });
  },

  // 绘制圆柱体导弹
  drawMissile(missile) {
    const ctx = this.ctx;
    const { x, y, angle, length, radius } = missile;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 导弹主体（圆柱体）
    const gradient = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    gradient.addColorStop(0, '#8b8b8b');
    gradient.addColorStop(0.3, '#c0c0c0');
    gradient.addColorStop(0.6, '#e8e8e8');
    gradient.addColorStop(1, '#ffffff');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    // 圆柱体主体 - 使用矩形替代 roundRect（兼容性更好）
    ctx.roundRect ? ctx.roundRect(-length / 2, -radius, length, radius * 2, radius) : ctx.rect(-length / 2, -radius, length, radius * 2);
    ctx.fill();

    // 弹头（圆锥形）
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.moveTo(length / 2, 0);
    ctx.lineTo(length / 2 - 20, -radius);
    ctx.lineTo(length / 2 - 20, radius);
    ctx.closePath();
    ctx.fill();

    // 尾翼
    ctx.fillStyle = '#696969';
    ctx.beginPath();
    ctx.moveTo(-length / 2 + 10, -radius);
    ctx.lineTo(-length / 2 - 15, -radius - 15);
    ctx.lineTo(-length / 2 + 5, -radius);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-length / 2 + 10, radius);
    ctx.lineTo(-length / 2 - 15, radius + 15);
    ctx.lineTo(-length / 2 + 5, radius);
    ctx.fill();

    // 导弹尖端高光
    ctx.strokeStyle = '#ffa500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(length / 2 - 5, -5);
    ctx.lineTo(length / 2 - 15, 0);
    ctx.lineTo(length / 2 - 5, 5);
    ctx.stroke();

    ctx.restore();
  },

  // 绘制尾焰
  drawExhaustFlame(missile) {
    const ctx = this.ctx;
    const { x, y, angle, radius } = missile;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 尾焰渐变
    const flameLength = 80 + Math.random() * 40;
    const gradient = ctx.createLinearGradient(-missile.length / 2 - flameLength, 0, -missile.length / 2, 0);
    gradient.addColorStop(0, 'rgba(255, 69, 0, 0)');
    gradient.addColorStop(0.2, 'rgba(255, 140, 0, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 165, 0, 0.9)');
    gradient.addColorStop(0.6, 'rgba(255, 215, 0, 0.7)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 69, 0, 1)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-missile.length / 2, -radius * 0.8);
    ctx.quadraticCurveTo(
      -missile.length / 2 - flameLength, 0,
      -missile.length / 2, radius * 0.8
    );
    ctx.closePath();
    ctx.fill();

    // 内部核心火焰
    const coreGradient = ctx.createLinearGradient(-missile.length / 2 - flameLength * 0.7, 0, -missile.length / 2, 0);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    coreGradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.6)');
    coreGradient.addColorStop(1, 'rgba(255, 200, 100, 0.8)');

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.moveTo(-missile.length / 2, -radius * 0.4);
    ctx.quadraticCurveTo(
      -missile.length / 2 - flameLength * 0.7, 0,
      -missile.length / 2, radius * 0.4
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  // 绘制粒子
  drawParticles() {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // 更新粒子状态
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life--;
      p.size *= 0.96;

      // 绘制粒子
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // 移除死亡的粒子
      if (p.life <= 0 || p.size < 0.5) {
        this.particles.splice(i, 1);
      }
    }
  },

  // 绘制爆炸冲击波
  drawShockwave() {
    const ctx = this.ctx;
    for (let i = this.expressions.length - 1; i >= 0; i--) {
      const wave = this.expressions[i];

      ctx.save();
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 100, ${wave.alpha})`;
      ctx.lineWidth = wave.lineWidth;
      ctx.stroke();
      ctx.restore();

      // 更新冲击波
      wave.radius += 5;
      wave.alpha -= 0.02;
      wave.lineWidth *= 0.95;

      // 移除消失的冲击波
      if (wave.alpha <= 0) {
        this.expressions.splice(i, 1);
      }
    }
  },

  // 绘制目标点
  drawTarget() {
    const ctx = this.ctx;
    ctx.save();

    // 目标圆圈
    ctx.strokeStyle = 'rgba(255, 69, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(this.canvasWidth / 2, this.canvasHeight * 0.3, 60, 0, Math.PI * 2);
    ctx.stroke();

    // 十字准星
    ctx.beginPath();
    ctx.moveTo(this.canvasWidth / 2 - 80, this.canvasHeight * 0.3);
    ctx.lineTo(this.canvasWidth / 2 + 80, this.canvasHeight * 0.3);
    ctx.moveTo(this.canvasWidth / 2, this.canvasHeight * 0.3 - 80);
    ctx.lineTo(this.canvasWidth / 2, this.canvasHeight * 0.3 + 80);
    ctx.stroke();

    ctx.restore();
  },

  // 动画循环
  startAnimation() {
    const that = this;
    let lastTime = Date.now();

    const animate = () => {
      if (!that.ctx) return;

      const now = Date.now();
      const delta = now - lastTime;

      // 限制帧率，约 60fps
      if (delta < 16) return;
      lastTime = now;

      // 清空画布
      that.ctx.clearRect(0, 0, that.canvasWidth, that.canvasHeight);

      // 绘制背景（深色夜空）
      that.ctx.fillStyle = '#1a1a2e';
      that.ctx.fillRect(0, 0, that.canvasWidth, that.canvasHeight);

      // 绘制目标点
      that.drawTarget();

      // 更新和绘制导弹
      for (let i = that.missiles.length - 1; i >= 0; i--) {
        const missile = that.missiles[i];

        if (!missile.active) continue;

        // 移动导弹
        const dx = missile.targetX - missile.x;
        const dy = missile.targetY - missile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const moveAngle = Math.atan2(dy, dx);

        missile.x += Math.cos(moveAngle) * missile.speed;
        missile.y += Math.sin(moveAngle) * missile.speed;
        missile.angle = moveAngle;

        // 绘制尾焰
        that.drawExhaustFlame(missile);

        // 绘制导弹
        that.drawMissile(missile);

        // 检查是否命中目标
        if (distance < 30) {
          missile.active = false;
          that.missiles.splice(i, 1);
          // 创建爆炸效果
          that.createExplosion(missile.x, missile.y);
          console.log('命中目标！');
        }
      }

      // 绘制爆炸粒子
      that.drawParticles();

      // 绘制冲击波
      that.drawShockwave();
    };

    // 使用 setInterval 模拟动画循环
    this.animateTimer = setInterval(animate, 16);
  }
});
