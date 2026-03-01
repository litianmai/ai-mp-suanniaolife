const canvasWidth = 300;
const canvasHeight = 300;
const tankSize = 24;
const bulletSize = 6;
const enemySize = 24;
const blockSize = 30;

// 方向常量
const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

Page({
  data: {
    level: 1,
    lives: 3,
    score: 0,
    gameOver: false,
    gameStarted: false,
    joystickX: 35,
    joystickY: 35,
    isJoystickTouched: false
  },

  onLoad() {
    this.initGame();
  },

  onUnload() {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
    }
  },

  // 初始化游戏
  initGame() {
    this.canvas = null;
    this.ctx = null;
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.walls = [];
    this.joystickTouchId = null;
    this.joystickCenter = { x: 35, y: 35 };
    this.joystickAngle = 0;
    this.joystickForce = 0;
    this.isFiring = false;
    this.lastFireTime = 0;
    this.enemySpawnTimer = 0;
    this.gameRunning = false;

    this.query = wx.createSelectorQuery();
    this.query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          this.canvas = res[0].node;
          this.ctx = this.canvas.getContext('2d');

          const dpr = wx.getSystemInfoSync().pixelRatio;
          this.canvas.width = canvasWidth * dpr;
          this.canvas.height = canvasHeight * dpr;
          this.ctx.scale(dpr, dpr);

          this.resetGame();
          this.draw();
        }
      });

    this.setupJoystickListeners();
  },

  // 设置摇杆监听
  setupJoystickListeners() {
    const joystickArea = this.query.select('.joystick-base');

    // 使用全局触摸监听
    this.touchHandler = (e) => {
      if (!this.data.isJoystickTouched) return;

      const touch = e.touches.find(t => t.identifier === this.joystickTouchId);
      if (!touch) return;

      const dx = touch.clientX - this.joystickCenter.x;
      const dy = touch.clientY - this.joystickCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 35;

      const actualDistance = Math.min(distance, maxDistance);
      this.joystickAngle = Math.atan2(dy, dx);
      this.joystickForce = actualDistance / maxDistance;

      const stickX = this.joystickCenter.x + Math.cos(this.joystickAngle) * actualDistance;
      const stickY = this.joystickCenter.y + Math.sin(this.joystickAngle) * actualDistance;

      this.setData({
        joystickX: stickX - 15,
        joystickY: stickY - 15
      });

      // 根据摇杆方向控制坦克
      if (this.player && this.joystickForce > 0.2) {
        this.player.moving = true;
        if (Math.abs(Math.cos(this.joystickAngle)) > Math.abs(Math.sin(this.joystickAngle))) {
          this.player.direction = Math.cos(this.joystickAngle) > 0 ? DIR.RIGHT : DIR.LEFT;
        } else {
          this.player.direction = Math.sin(this.joystickAngle) > 0 ? DIR.DOWN : DIR.UP;
        }
      } else if (this.player) {
        this.player.moving = false;
      }
    };

    wx.onTouchMove(this.touchHandler);
    wx.onTouchEnd(this.handleJoystickEnd);
  },

  handleJoystickEnd: (e) => {
    this.joystickTouchId = null;
    this.setData({
      isJoystickTouched: false,
      joystickX: 35,
      joystickY: 35
    });
    if (this.player) {
      this.player.moving = false;
    }
  },

  handleJoystickStart: (e) => {
    if (this.joystickTouchId !== null) return;

    const touch = e.touches[0];
    this.joystickTouchId = touch.identifier;
    this.joystickCenter = { x: touch.clientX, y: touch.clientY };

    this.setData({
      isJoystickTouched: true
    });
  },

  handleFireStart() {
    this.isFiring = true;
  },

  handleFireEnd() {
    this.isFiring = false;
  },

  // 重置游戏
  resetGame() {
    this.player = {
      x: canvasWidth / 2 - tankSize / 2,
      y: canvasHeight - tankSize - 10,
      direction: DIR.UP,
      speed: 2,
      moving: false,
      color: '#4CAF50'
    };

    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.walls = [];
    this.score = 0;
    this.lives = 3;
    this.level = 1;

    this.generateWalls();
    this.spawnEnemy();
  },

  // 生成墙壁
  generateWalls() {
    const wallPattern = [
      [1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,0,1,1,0,1],
      [1,0,1,1,0,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,1],
      [1,0,0,1,1,1,1,0,0,1],
      [1,0,0,1,0,0,1,0,0,1],
      [1,0,0,1,1,1,1,0,0,1],
      [1,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1]
    ];

    for (let row = 0; row < wallPattern.length; row++) {
      for (let col = 0; col < wallPattern[row].length; col++) {
        if (wallPattern[row][col] === 1) {
          this.walls.push({
            x: col * blockSize + 5,
            y: row * blockSize + 20,
            width: blockSize - 2,
            height: blockSize - 2
          });
        }
      }
    }
  },

  // 生成敌人
  spawnEnemy() {
    if (this.enemies.length >= 4) return;

    const positions = [
      { x: 10, y: 10 },
      { x: canvasWidth / 2 - enemySize / 2, y: 10 },
      { x: canvasWidth - enemySize - 10, y: 10 }
    ];
    const pos = positions[Math.floor(Math.random() * positions.length)];

    this.enemies.push({
      x: pos.x,
      y: pos.y,
      direction: DIR.DOWN,
      speed: 1,
      moveTimer: 0,
      color: '#F44336'
    });
  },

  // 开始游戏
  startGame() {
    this.setData({ gameStarted: true, gameOver: false });
    this.resetGame();
    this.gameRunning = true;
    this.gameLoop = this.update.bind(this);
  },

  // 重新开始
  restartGame() {
    this.setData({ gameOver: false, gameStarted: true });
    this.resetGame();
    this.gameRunning = true;
  },

  // 游戏主循环
  update() {
    if (!this.gameRunning) return;

    this.updatePlayer();
    this.updateBullets();
    this.updateEnemies();
    this.checkCollisions();
    this.draw();

    this.gameLoop = requestAnimationFrame(this.update.bind(this));
  },

  // 更新玩家
  updatePlayer() {
    if (!this.player || !this.player.moving) return;

    let newX = this.player.x;
    let newY = this.player.y;

    switch (this.player.direction) {
      case DIR.UP: newY -= this.player.speed; break;
      case DIR.DOWN: newY += this.player.speed; break;
      case DIR.LEFT: newX -= this.player.speed; break;
      case DIR.RIGHT: newX += this.player.speed; break;
    }

    // 边界检测
    newX = Math.max(0, Math.min(canvasWidth - tankSize, newX));
    newY = Math.max(0, Math.min(canvasHeight - tankSize, newY));

    // 墙壁碰撞
    const playerRect = { x: newX, y: newY, width: tankSize, height: tankSize };
    if (!this.walls.some(wall => this.rectIntersect(playerRect, wall))) {
      this.player.x = newX;
      this.player.y = newY;
    }

    // 射击
    const now = Date.now();
    if (this.isFiring && now - this.lastFireTime > 300) {
      this.fireBullet();
      this.lastFireTime = now;
    }
  },

  // 发射子弹
  fireBullet() {
    const cx = this.player.x + tankSize / 2;
    const cy = this.player.y + tankSize / 2;

    let bx = cx, by = cy;
    let vx = 0, vy = 0;
    const bulletSpeed = 5;

    switch (this.player.direction) {
      case DIR.UP: by -= tankSize / 2; vy = -bulletSpeed; break;
      case DIR.DOWN: by += tankSize / 2; vy = bulletSpeed; break;
      case DIR.LEFT: bx -= tankSize / 2; vx = -bulletSpeed; break;
      case DIR.RIGHT: bx += tankSize / 2; vx = bulletSpeed; break;
    }

    this.bullets.push({ x: bx, y: by, vx, vy });
  },

  // 更新子弹
  updateBullets() {
    // 玩家子弹
    this.bullets = this.bullets.filter(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // 出界
      if (bullet.x < 0 || bullet.x > canvasWidth || bullet.y < 0 || bullet.y > canvasHeight) {
        return false;
      }

      // 击毁墙壁
      const bulletRect = { x: bullet.x - bulletSize/2, y: bullet.y - bulletSize/2, width: bulletSize, height: bulletSize };
      const wallIndex = this.walls.findIndex(wall => this.rectIntersect(bulletRect, wall));
      if (wallIndex !== -1) {
        this.walls.splice(wallIndex, 1);
        return false;
      }

      // 击中敌人
      const hitEnemy = this.enemies.some((enemy, i) => {
        const enemyRect = { x: enemy.x, y: enemy.y, width: enemySize, height: enemySize };
        if (this.rectIntersect(bulletRect, enemyRect)) {
          this.enemies.splice(i, 1);
          this.setData({ score: this.data.score + 100 });
          return true;
        }
        return false;
      });

      return !hitEnemy;
    });

    // 敌人子弹
    this.enemyBullets = this.enemyBullets.filter(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      if (bullet.x < 0 || bullet.x > canvasWidth || bullet.y < 0 || bullet.y > canvasHeight) {
        return false;
      }

      const bulletRect = { x: bullet.x - bulletSize/2, y: bullet.y - bulletSize/2, width: bulletSize, height: bulletSize };

      // 击中玩家
      const playerRect = { x: this.player.x, y: this.player.y, width: tankSize, height: tankSize };
      if (this.rectIntersect(bulletRect, playerRect)) {
        this.lives--;
        this.setData({ lives: this.lives });
        if (this.lives <= 0) {
          this.gameOver();
        }
        return false;
      }

      return true;
    });
  },

  // 更新敌人
  updateEnemies() {
    this.enemies.forEach(enemy => {
      enemy.moveTimer++;

      if (enemy.moveTimer > 60) {
        enemy.moveTimer = 0;
        enemy.direction = Math.floor(Math.random() * 4);
      }

      let newX = enemy.x;
      let newY = enemy.y;

      switch (enemy.direction) {
        case DIR.UP: newY -= enemy.speed; break;
        case DIR.DOWN: newY += enemy.speed; break;
        case DIR.LEFT: newX -= enemy.speed; break;
        case DIR.RIGHT: newX += enemy.speed; break;
      }

      newX = Math.max(0, Math.min(canvasWidth - enemySize, newX));
      newY = Math.max(0, Math.min(canvasHeight - enemySize, newY));

      const enemyRect = { x: newX, y: newY, width: enemySize, height: enemySize };
      if (!this.walls.some(wall => this.rectIntersect(enemyRect, wall))) {
        enemy.x = newX;
        enemy.y = newY;
      } else {
        enemy.direction = Math.floor(Math.random() * 4);
      }

      // 敌人射击
      if (Math.random() < 0.02) {
        const cx = enemy.x + enemySize / 2;
        const cy = enemy.y + enemySize / 2;
        let bx = cx, by = cy;
        let vx = 0, vy = 0;

        switch (enemy.direction) {
          case DIR.UP: by -= enemySize / 2; vy = -3; break;
          case DIR.DOWN: by += enemySize / 2; vy = 3; break;
          case DIR.LEFT: bx -= enemySize / 2; vx = -3; break;
          case DIR.RIGHT: bx += enemySize / 2; vx = 3; break;
        }

        this.enemyBullets.push({ x: bx, y: by, vx, vy });
      }
    });

    // 生成新敌人
    this.enemySpawnTimer++;
    if (this.enemySpawnTimer > 180) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
    }
  },

  // 碰撞检测
  checkCollisions() {
    // 玩家与敌人碰撞
    const playerRect = { x: this.player.x, y: this.player.y, width: tankSize, height: tankSize };
    this.enemies.some((enemy, i) => {
      const enemyRect = { x: enemy.x, y: enemy.y, width: enemySize, height: enemySize };
      if (this.rectIntersect(playerRect, enemyRect)) {
        this.lives--;
        this.setData({ lives: this.lives });
        this.enemies.splice(i, 1);
        if (this.lives <= 0) {
          this.gameOver();
        }
        return true;
      }
      return false;
    });
  },

  // 矩形相交检测
  rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
             r2.x + r2.width < r1.x ||
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
  },

  // 游戏结束
  gameOver() {
    this.gameRunning = false;
    this.setData({ gameOver: true });
  },

  // 绘制
  draw() {
    if (!this.ctx) return;

    // 清空画布 - 黑色背景
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制墙壁 - 红白机风格的砖块
    this.walls.forEach(wall => {
      this.ctx.fillStyle = '#B7410E';
      this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      // 砖块细节
      this.ctx.strokeStyle = '#FF6B35';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(wall.x + 2, wall.y + 2, wall.width - 4, wall.height - 4);
    });

    // 绘制玩家坦克 - 绿色
    if (this.player) {
      this.drawTank(this.player.x, this.player.y, this.player.direction, '#4CAF50', true);
    }

    // 绘制敌人坦克 - 红色
    this.enemies.forEach(enemy => {
      this.drawTank(enemy.x, enemy.y, enemy.direction, '#F44336', false);
    });

    // 绘制玩家子弹 - 白色
    this.ctx.fillStyle = '#FFFFFF';
    this.bullets.forEach(bullet => {
      this.ctx.fillRect(bullet.x - bulletSize/2, bullet.y - bulletSize/2, bulletSize, bulletSize);
    });

    // 绘制敌人子弹 - 黄色
    this.ctx.fillStyle = '#FFEB3B';
    this.enemyBullets.forEach(bullet => {
      this.ctx.fillRect(bullet.x - bulletSize/2, bullet.y - bulletSize/2, bulletSize, bulletSize);
    });
  },

  // 绘制坦克
  drawTank(x, y, direction, color, isPlayer) {
    this.ctx.save();
    this.ctx.translate(x + tankSize/2, y + tankSize/2);
    this.ctx.rotate(direction * Math.PI / 2);
    this.ctx.translate(-(x + tankSize/2), -(y + tankSize/2));

    // 坦克主体
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + 4, y + 4, tankSize - 8, tankSize - 8);

    // 履带
    this.ctx.fillStyle = isPlayer ? '#2E7D32' : '#C62828';
    this.ctx.fillRect(x, y, 6, tankSize);
    this.ctx.fillRect(x + tankSize - 6, y, 6, tankSize);

    // 炮管
    this.ctx.fillStyle = isPlayer ? '#66BB6A' : '#EF5350';
    this.ctx.fillRect(x + tankSize/2 - 3, y - 2, 6, 12);

    // 炮塔
    this.ctx.fillStyle = isPlayer ? '#81C784' : '#E57373';
    this.ctx.fillRect(x + 6, y + 6, tankSize - 12, tankSize - 12);

    this.ctx.restore();
  }
});
