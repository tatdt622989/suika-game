/* eslint-disable import/no-extraneous-dependencies */
import './style.scss';
import Matter from 'matter-js';
import { Modal } from 'bootstrap';
import getCanvasBase64 from './assets/utilities/getCanvasBase64';
import t1 from './assets/images/t1.png';
import t2 from './assets/images/t2.png';
import t3 from './assets/images/t3.png';
import t4 from './assets/images/t4.png';
import t5 from './assets/images/t5.png';
import t6 from './assets/images/t6.png';
import t7 from './assets/images/t7.png';
import t8 from './assets/images/t8.png';
import t9 from './assets/images/t9.png';
import t10 from './assets/images/t10.png';

const scene = document.querySelector('#scene');
const imgUrl = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10];

// preload images
imgUrl.forEach((url) => {
  const img = new Image();
  img.src = url;
});

const {
  Engine, Render, Composite, Bodies, Body, Runner, Events,
} = Matter;
const engine = Engine.create();
const { world } = engine;
const render = Render.create({
  element: scene,
  engine,
  options: {
    width: 900,
    height: 900,
    wireframes: false,
    background: 'transparent',
  },
});
const gameOverModal = new Modal('#gameOverModal', {
  keyboard: false,
});
let isGameOver = false;
const score = {
  num: 0,
  get value() {
    return this.num;
  },
  set value(newValue) {
    this.num = newValue;
    document.querySelector('#score .num').textContent = this.num;
    document.querySelector('#gameOverScore').textContent = this.num;
  },
};
const highScore = {
  num: 0,
  get value() {
    return this.num;
  },
  set value(newValue) {
    this.num = newValue;
    document.querySelector('#highScore .num').textContent = this.num;
  },
};

if (localStorage.getItem('score')) {
  highScore.value = localStorage.getItem('score');
}

const categoryOn = 0x0001;
const categoryOff = 0x0002;

Composite.add(world, [
  Bodies.rectangle(-10, 450, 20, 900, {
    isStatic: true,
    render: {
      fillStyle: '#000000',
    },
    collisionFilter: {
      group: 1,
      category: categoryOn,
      mask: categoryOn,
    },
  }),
  Bodies.rectangle(910, 400, 20, 900, {
    isStatic: true,
    render: {
      fillStyle: '#000000',
    },
    collisionFilter: {
      group: 1,
      category: categoryOn,
      mask: categoryOn,
    },
  }),
  Bodies.rectangle(450, 910, 900, 20, {
    isStatic: true,
    render: {
      fillStyle: '#000000',
    },
    friction: 0,
    collisionFilter: {
      group: 1,
      category: categoryOn,
      mask: categoryOn,
    },
  }),
]);

Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

const createBall = (level, isStatic = true, x = 0, y = null, canCollision = true) => {
  const scale = 0.85;
  const sizes = [30, 45, 60, 80, 100, 120, 140, 160, 180, 200, 220];
  const size = sizes[level] * scale;
  const ball = Bodies.circle(x, y ?? 140, size, {
    label: 'ball',
    restitution: 0.1,
    mass: 8,
    level,
    render: {
      sprite: {
        texture: imgUrl[level],
        xScale: scale,
        yScale: scale,
      },
    },
    collisionFilter: {
      group: canCollision ? 1 : -1,
      category: canCollision ? categoryOn : categoryOff,
      mask: canCollision ? categoryOn : categoryOff,
    },
  });

  Composite.add(world, ball);

  if (isStatic) {
    Body.setStatic(ball, isStatic);
  }

  return ball;
};

let holdBall = createBall(0, true, 512, 140, false);

const handleMoveEvents = (e) => {
  if (!holdBall) return;
  e.preventDefault();
  const x = e.offsetX === undefined ? e.touches[0].offsetX : e.offsetX;
  Body.setPosition(holdBall, { x, y: 140 });
};
const handleDropEvents = (e) => {
  if (!holdBall) return;
  Body.set(holdBall, 'collisionFilter', {
    group: 1,
    category: categoryOn,
    mask: categoryOn,
  });
  Body.setStatic(holdBall, false);
  holdBall.updateTs = Date.now();
  holdBall = null;
  const x = e.offsetX === undefined ? e.touches[0].offsetX : e.offsetX;
  setTimeout(() => {
    if (isGameOver) return;
    const level = Math.floor(Math.random() * 5);
    holdBall = createBall(level, true, x, null, false);
  }, 500);
};

// register events
scene.addEventListener('mousemove', handleMoveEvents, false);
// scene.addEventListener('touchmove', handleMoveEvents);
scene.addEventListener('mouseup', handleDropEvents, false);
// scene.addEventListener('touchend', handleDropEvents);
// 監聽碰撞事件
Events.on(engine, 'collisionStart', (event) => {
  const { pairs } = event;
  // 遍歷碰撞對
  let validPairs = new Set();
  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i];
    // 檢查碰撞對中的物體是否為非靜態的、沒有被合併過、且等級相同
    if (!pair.bodyA.isStatic
      && !pair.bodyB.isStatic
      && pair.bodyA.level < 10
      && pair.bodyA.level === pair.bodyB.level
      && !validPairs.has(pair.bodyA.id)
      && !validPairs.has(pair.bodyB.id)
    ) {
      // 取得兩個物體的中心點
      const x = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
      const y = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;
      // 將新物體添加到世界中，並移除碰撞的原始物體
      Composite.remove(engine.world, [pair.bodyA, pair.bodyB]);
      const ball = createBall(pair.bodyA.level + 1, false, x, y);
      ball.updateTs = Date.now();
      score.value += 10 * (pair.bodyA.level + 1);
      validPairs = new Set([...validPairs, pair.bodyA.id, pair.bodyB.id]);
    }
  }
});
// 檢測所有球的包圍框是否小於y=140，是的話就結束遊戲
Events.on(engine, 'afterUpdate', () => {
  const balls = Composite.allBodies(engine.world).filter((body) => body.label === 'ball'
    && body.collisionFilter.group === 1
    && body.collisionFilter.category === categoryOn
    && Date.now() - body.updateTs > 1000);
  isGameOver = balls.some((ball) => ball.bounds.min.y < 140);
  if (isGameOver) {
    Runner.stop(runner);
    gameOverModal.show();
    document.querySelector('#screenshot').src = getCanvasBase64();
    if (score.value > highScore.value) {
      highScore.value = score.value;
      localStorage.setItem('score', score.value);
    }
  }
});
// 重新開始遊戲按鈕
document.querySelector('#restart').addEventListener('click', () => {
  gameOverModal.hide();
  score.value = 0;
  isGameOver = false;
  // 清除除了邊界以外的所有物體
  Composite.allBodies(engine.world).forEach((body) => {
    if (body.label === 'ball') {
      Composite.remove(engine.world, body);
    }
  });
  holdBall = createBall(0, true, 512, 140, false);
  Runner.run(runner, engine);
});
