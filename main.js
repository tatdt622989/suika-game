import './style.scss';
import Matter from 'matter-js';
import { Modal } from 'bootstrap';

const scene = document.querySelector('#scene');

const {
  Engine, Render, Composite, Bodies, Body, Runner, Events,
} = Matter;
const engine = Engine.create();
const { world } = engine;
const render = Render.create({
  element: scene,
  engine,
  options: {
    width: 960,
    height: 1024,
    wireframes: false,
    background: 'transparent',
  },
});
const gameOverModal = new Modal('#gameOverModal', {
  keyboard: false,
});
let isGameOver = false;
let score = 0;

const getCanvasBase64 = () => {
  const canvas = document.querySelector('#scene canvas');
  const dataURL = canvas.toDataURL();
  return dataURL;
};

const categoryOn = 0x0001;
const categoryOff = 0x0002;

Composite.add(world, [
  Bodies.rectangle(-10, 512, 20, 960, {
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
  Bodies.rectangle(970, 512, 20, 960, {
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
  Bodies.rectangle(512, 1034, 960, 20, {
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
  const sizes = [30, 45, 60, 80, 100, 120, 140, 160, 180, 200];
  const size = sizes[level];
  const ball = Bodies.circle(x, y ?? 180, size, {
    label: 'ball',
    restitution: 0.1,
    mass: 8,
    level,
    render: {
      sprite: {
        texture: `./src/images/t${level + 1}.png`,
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

let holdBall = createBall(0, true, 512, 180, false);

const handleMoveEvents = (e) => {
  if (!holdBall) return;
  e.preventDefault();
  const x = e.offsetX === undefined ? e.touches[0].offsetX : e.offsetX;
  Body.setPosition(holdBall, { x, y: 180 });
};

const handleDropEvents = (e) => {
  if (!holdBall) return;
  Body.set(holdBall, 'collisionFilter', {
    group: 1,
    category: categoryOn,
    mask: categoryOn,
  });
  Body.setStatic(holdBall, false);
  holdBall.dropTs = Date.now();
  holdBall = null;
  const x = e.offsetX === undefined ? e.touches[0].offsetX : e.offsetX;
  setTimeout(() => {
    console.log('drop2');
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
  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i];

    // 檢查碰撞對中的物體是否為非靜態的
    if (!pair.bodyA.isStatic
      && !pair.bodyB.isStatic
      && pair.bodyA.level < 10
      && pair.bodyA.level === pair.bodyB.level) {
      // 取得兩個物體的中心點
      const x = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
      const y = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;
      // 將新物體添加到世界中，並移除碰撞的原始物體
      Composite.remove(engine.world, [pair.bodyA, pair.bodyB]);
      createBall(pair.bodyA.level + 1, false, x, y);
      score += 10 * (pair.bodyA.level + 1);
      document.querySelector('#score .num').textContent = score;
    }
  }
});
// 檢測所有球的包圍框是否小於y=180，是的話就結束遊戲
Events.on(engine, 'afterUpdate', () => {
  const balls = Composite.allBodies(engine.world).filter((body) => body.label === 'ball'
    && body.collisionFilter.group === 1
    && body.collisionFilter.category === categoryOn
    && Date.now() - body.dropTs > 1000);
  isGameOver = balls.some((ball) => ball.bounds.min.y < 180);
  if (isGameOver) {
    Runner.stop(runner);
    gameOverModal.show();
    document.querySelector('#screenshot').src = getCanvasBase64();
  }
});
