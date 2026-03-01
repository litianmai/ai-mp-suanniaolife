// 游戏配置
const canvasWidth = 375;
const canvasHeight = 500;

// 方向常量
const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

// 图片资源
const IMAGES = {
  // 玩家坦克（绿色）
  playerTank: [
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGreen1.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGreen2.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGreen3.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGreen4.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGreen5.png'
  ],
  // 敌人坦克（灰色）
  enemyTank: [
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGrey1.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGrey2.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGrey3.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGrey4.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tanks_tankGrey5.png'
  ],
  // 子弹
  bullet: '/assets/sprites/kenney_tanks/PNG/Default size/tank_bulletFly.png',
  // 爆炸
  explosion: [
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion1.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion2.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion3.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion4.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion5.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion6.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion7.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion8.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion9.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion10.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion11.png',
    '/assets/sprites/kenney_tanks/PNG/Default size/tank_explosion12.png'
  ],
  // 墙壁
  wallWood: '/assets/sprites/kenney_tanks/PNG/Default size/tanks_crateWood.png',
  wallAmmo: '/assets/sprites/kenney_tanks/PNG/Default size/tanks_crateAmmo.png',
  wallArmor: '/assets/sprites/kenney_tanks/PNG/Default size/tanks_crateArmor.png',
  wallRepair: '/assets/sprites/kenney_tanks/PNG/Default size/tanks_crateRepair.png'
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
    isJoystickTouched: false,
    canvasWidth: canvasWidth,
    canvasHeight: canvasHeight
  },

  onLoad() {
    this.initGame();
  },

  onUnload() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
    wx.offTouchMove(this.touchHandler);
    wx.offTouchEnd(this.handleJoystickEnd);
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
    this.explosions = [];
    this.joystickTouchId = null;
    this.joystickCenter = { x: 35, y: 35 };
    this.joystickAngle = 0;
    this.joystickForce = 0;
    this.isFiring = false;
    this.lastFireTime = 0;
    this.enemySpawnTimer = 0;
    this.gameRunning = false;
    this.images = {};
    this.imagesLoaded = false;

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

          this.loadImages();
        }
      });

    this.setupJoystickListeners();
  },

  // 加载图片资源
  loadImages() {
    let loaded = 0;
    const total = 20;

    const loadImg = (src) => {
      return new Promise((resolve) => {
        const img = this.canvas.createImage();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    };

    // 加载玩家坦克
    Promise.all(IMAGES.playerTank.map(src => loadImg(src))).then(imgs => {
      this.images.playerTank = imgs.filter(i => i);
    });

    // 加载敌人坦克
    Promise.all(IMAGES.enemyTank.map(src => loadImg(src))).then(imgs => {
      this.images.enemyTank = imgs.filter(i => i);
    });

    // 加载子弹
    loadImg(IMAGES.bullet).then(img => {
      this.images.bullet = img;
    });

    // 加载爆炸
    Promise.all(IMAGES.explosion.map(src => loadImg(src))).then(imgs => {
      this.images.explosion = imgs.filter(i => i);
    });

    // 加载墙壁
    Promise.all([
      loadImg(IMAGES.wallWood),
      loadImg(IMAGES.wallAmmo),
      loadImg(IMAGES.wallArmor),
      loadImg(IMAGES.wallRepair)
    ]).then(imgs => {
      this.images.walls = imgs.filter(i => i);
      this.imagesLoaded = true;
      this.resetGame();
      this.draw();
    });
  },

  // 设置摇杆监听
  setupJoystickListeners() {
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
      x: canvasWidth / 2 - 24,
      y: canvasHeight - 60,
      direction: DIR.UP,
      speed: 2.5,
      moving: false,
      frameIndex: 0
    };

    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.walls = [];
    this.explosions = [];
    this.score = 0;
    this.lives = 3;
    this.level = 1;

    this.setData({ score: 0, lives: 3, level: 1 });
    this.generateWalls();
    this.spawnEnemy();
  },

  // 生成墙壁
  generateWalls() {
    const wallPattern = [
      [0,0,0,0,0,0,0,0,0,0],
      [0,1,1,0,0,0,0,1,1,0],
      [0,1,1,0,0,0,0,1,1,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,1,0,0,0,0,0,0,1,0],
      [0,1,0,0,2,2,0,0,1,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0]
    ];

    const blockSize = 40;
    for (let row = 0; row < wallPattern.length; row++) {
      for (let col = 0; col < wallPattern[row].length; col++) {
        if (wallPattern[row][col] > 0) {
          this.walls.push({
            x: col * blockSize + 10,
            y: row * blockSize + 50,
            width: blockSize - 4,
            height: blockSize - 4,
            type: wallPattern[row][col],
            health: 2
          });
        }
      }
    }
  },

  // 生成敌人
  spawnEnemy() {
    if (this.enemies.length >= 4) return;

    const positions = [
      { x: 20, y: 60 },
      { x: canvasWidth / 2 - 24, y: 60 },
      { x: canvasWidth - 68, y: 60 }
    ];
    const pos = positions[Math.floor(Math.random() * positions.length)];

    this.enemies.push({
      x: pos.x,
      y: pos.y,
      direction: DIR.DOWN,
      speed: 1.5,
      moveTimer: 0,
      frameIndex: 0
    });
  },

  // 开始游戏
  startGame() {
    this.setData({ gameStarted: true, gameOver: false });
    this.resetGame();
    this.gameRunning = true;
    this.gameLoop = setInterval(this.update.bind(this), 16);
  },

  // 重新开始
  restartGame() {
    this.setData({ gameOver: false, gameStarted: true });
    this.resetGame();
    this.gameRunning = true;
  },

  // 游戏主循环
  update() {
    if (!this.gameRunning || !this.imagesLoaded) return;

    this.updatePlayer();
    this.updateBullets();
    this.updateEnemies();
    this.updateExplosions();
    this.checkCollisions();
    this.draw();
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

    newX = Math.max(10, Math.min(canvasWidth - 58, newX));
    newY = Math.max(50, Math.min(canvasHeight - 50, newY));

    const playerRect = { x: newX, y: newY, width: 48, height: 48 };
    if (!this.walls.some(wall => this.rectIntersect(playerRect, wall))) {
      this.player.x = newX;
      this.player.y = newY;
    }

    const now = Date.now();
    if (this.isFiring && now - this.lastFireTime > 400) {
      this.fireBullet();
      this.lastFireTime = now;
    }
  },

  // 发射子弹
  fireBullet() {
    const cx = this.player.x + 24;
    const cy = this.player.y + 24;

    let bx = cx, by = cy;
    let vx = 0, vy = 0;
    const bulletSpeed = 6;

    switch (this.player.direction) {
      case DIR.UP: by = this.player.y; vy = -bulletSpeed; break;
      case DIR.DOWN: by = this.player.y + 48; vy = bulletSpeed; break;
      case DIR.LEFT: bx = this.player.x; vx = -bulletSpeed; break;
      case DIR.RIGHT: bx = this.player.x + 48; vx = bulletSpeed; break;
    }

    this.bullets.push({ x: bx, y: by, vx, vy, direction: this.player.direction });
  },

  // 更新子弹
  updateBullets() {
    this.bullets = this.bullets.filter(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      if (bullet.x < 0 || bullet.x > canvasWidth || bullet.y < 50 || bullet.y > canvasHeight) {
        return false;
      }

      const bulletRect = { x: bullet.x - 4, y: bullet.y - 4, width: 8, height: 8 };

      const wallIndex = this.walls.findIndex(wall => this.rectIntersect(bulletRect, wall));
      if (wallIndex !== -1) {
        this.walls[wallIndex].health--;
        if (this.walls[wallIndex].health <= 0) {
          this.createExplosion(this.walls[wallIndex].x, this.walls[wallIndex].y, true);
          this.walls.splice(wallIndex, 1);
        }
        return false;
      }

      const hitEnemy = this.enemies.some((enemy, i) => {
        const enemyRect = { x: enemy.x, y: enemy.y, width: 48, height: 48 };
        if (this.rectIntersect(bulletRect, enemyRect)) {
          this.createExplosion(enemy.x + 24, enemy.y + 24, false);
          this.enemies.splice(i, 1);
          this.setData({ score: this.data.score + 100 });
          return true;
        }
        return false;
      });

      return !hitEnemy;
    });

    this.enemyBullets = this.enemyBullets.filter(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      if (bullet.x < 0 || bullet.x > canvasWidth || bullet.y < 50 || bullet.y > canvasHeight) {
        return false;
      }

      const bulletRect = { x: bullet.x - 4, y: bullet.y - 4, width: 8, height: 8 };
      const playerRect = { x: this.player.x, y: this.player.y, width: 48, height: 48 };

      if (this.rectIntersect(bulletRect, playerRect)) {
        this.createExplosion(this.player.x + 24, this.player.y + 24, false);
        this.lives--;
        this.setData({ lives: this.lives });
        if (this.lives <= 0) {
          this.gameOver();
        } else {
          this.player.x = canvasWidth / 2 - 24;
          this.player.y = canvasHeight - 60;
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

      newX = Math.max(10, Math.min(canvasWidth - 58, newX));
      newY = Math.max(50, Math.min(canvasHeight - 50, newY));

      const enemyRect = { x: newX, y: newY, width: 48, height: 48 };
      if (!this.walls.some(wall => this.rectIntersect(enemyRect, wall))) {
        enemy.x = newX;
        enemy.y = newY;
      } else {
        enemy.direction = Math.floor(Math.random() * 4);
      }

      if (Math.random() < 0.02) {
        const cx = enemy.x + 24;
        const cy = enemy.y + 24;
        let bx = cx, by = cy;
        let vx = 0, vy = 0;

        switch (enemy.direction) {
          case DIR.UP: by = enemy.y; vy = -4; break;
          case DIR.DOWN: by = enemy.y + 48; vy = 4; break;
          case DIR.LEFT: bx = enemy.x; vx = -4; break;
          case DIR.RIGHT: bx = enemy.x + 48; vx = 4; break;
        }

        this.enemyBullets.push({ x: bx, y: by, vx, vy });
      }
    });

    this.enemySpawnTimer++;
    if (this.enemySpawnTimer > 180) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
    }
  },

  // 更新爆炸效果
  updateExplosions() {
    this.explosions = this.explosions.filter(exp => {
      exp.frameIndex++;
      return exp.frameIndex < exp.frames.length;
    });
  },

  // 创建爆炸
  createExplosion(x, y, isWall) {
    this.explosions.push({
      x, y,
      frameIndex: 0,
      frames: this.images.explosion
    });
  },

  // 碰撞检测
  checkCollisions() {
    const playerRect = { x: this.player.x, y: this.player.y, width: 48, height: 48 };
    this.enemies.some((enemy, i) => {
      const enemyRect = { x: enemy.x, y: enemy.y, width: 48, height: 48 };
      if (this.rectIntersect(playerRect, enemyRect)) {
        this.createExplosion(enemy.x + 24, enemy.y + 24, false);
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

  rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
             r2.x + r2.width < r1.x ||
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
  },

  gameOver() {
    this.gameRunning = false;
    this.setData({ gameOver: true });
  },

  // 绘制
  draw() {
    if (!this.ctx || !this.imagesLoaded) return;

    // 清空画布
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制网格背景
    this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < canvasWidth; i += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 50);
      this.ctx.lineTo(i, canvasHeight);
      this.ctx.stroke();
    }

    // 绘制墙壁
    this.walls.forEach(wall => {
      const imgIndex = (wall.type - 1) % this.images.walls.length;
      if (this.images.walls[imgIndex]) {
        this.ctx.drawImage(this.images.walls[imgIndex], wall.x, wall.y, wall.width, wall.height);
      } else {
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      }
    });

    // 绘制玩家坦克
    if (this.player) {
      const tankImgs = this.images.playerTank;
      if (tankImgs && tankImgs.length > 0) {
        const frame = tankImgs[Math.min(this.player.direction, tankImgs.length - 1)];
        if (frame) {
          this.ctx.save();
          this.ctx.translate(this.player.x + 24, this.player.y + 24);
          this.ctx.rotate(this.player.direction * Math.PI / 2);
          this.ctx.translate(-this.player.x - 24, -this.player.y - 24);
          this.ctx.drawImage(frame, this.player.x, this.player.y, 48, 48);
          this.ctx.restore();
        }
      }
    }

    // 绘制敌人坦克
    this.enemies.forEach(enemy => {
      const tankImgs = this.images.enemyTank;
      if (tankImgs && tankImgs.length > 0) {
        const frame = tankImgs[Math.min(enemy.direction, tankImgs.length - 1)];
        if (frame) {
          this.ctx.save();
          this.ctx.translate(enemy.x + 24, enemy.y + 24);
          this.ctx.rotate(enemy.direction * Math.PI / 2);
          this.ctx.translate(-enemy.x - 24, -enemy.y - 24);
          this.ctx.drawImage(frame, enemy.x, enemy.y, 48, 48);
          this.ctx.restore();
        }
      }
    });

    // 绘制玩家子弹
    this.bullets.forEach(bullet => {
      if (this.images.bullet) {
        this.ctx.save();
        this.ctx.translate(bullet.x, bullet.y);
        this.ctx.rotate(bullet.direction * Math.PI / 2);
        this.ctx.translate(-6, -6);
        this.ctx.drawImage(this.images.bullet, 0, 0, 12, 12);
        this.ctx.restore();
      } else {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // 绘制敌人子弹
    this.enemyBullets.forEach(bullet => {
      this.ctx.fillStyle = '#FF4500';
      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 绘制爆炸效果
    this.explosions.forEach(exp => {
      if (exp.frames && exp.frames.length > 0) {
        const frame = exp.frames[Math.min(exp.frameIndex, exp.frames.length - 1)];
        if (frame) {
          this.ctx.drawImage(frame, exp.x - 32, exp.y - 32, 64, 64);
        }
      }
    });
  }
});
