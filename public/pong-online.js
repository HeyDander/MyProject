const canvas = document.querySelector('.arcade-board');
const ctx = canvas.getContext('2d');
const youEl = document.querySelector('[data-mp-you]');
const enemyEl = document.querySelector('[data-mp-enemy]');
const roomEl = document.querySelector('[data-mp-room]');
const statusEl = document.querySelector('[data-mp-status]');
const messageEl = document.querySelector('[data-mp-message]');
const joinForm = document.querySelector('[data-mp-join-form]');
const createBtn = document.querySelector('[data-mp-create]');
const restartBtn = document.querySelector('[data-mp-restart]');
const TT = (en, ru) =>
  window.UII18N && typeof window.UII18N.t === 'function' ? window.UII18N.t(en, ru) : en;

const state = {
  code: '',
  role: '',
  game: null,
  rewardGiven: false,
  lastInputAt: 0,
  touchDrag: null,
};

function setMsg(text, isError = false) {
  if (!messageEl) return;
  messageEl.textContent = text || '';
  messageEl.classList.toggle('is-error', Boolean(isError));
  messageEl.classList.toggle('is-success', !isError && Boolean(text));
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function updateScore() {
  if (!state.game || !youEl || !enemyEl) return;
  const meHost = state.role === 'host';
  const you = meHost ? state.game.scores.host : state.game.scores.guest;
  const enemy = meHost ? state.game.scores.guest : state.game.scores.host;
  youEl.textContent = String(you || 0);
  enemyEl.textContent = String(enemy || 0);
}

function skinColors() {
  const skin = window.GameSkins ? window.GameSkins.getCurrentSkin() : null;
  return {
    primary: skin ? skin.palette.primary : '#74c691',
    secondary: skin ? skin.palette.secondary : '#356f4d',
    accent: skin ? skin.palette.accent : '#c5f3d2',
  };
}

function draw() {
  const { primary, secondary, accent } = skinColors();
  ctx.fillStyle = '#0b130f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(124, 168, 140, 0.35)';
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!state.game) {
    ctx.fillStyle = accent;
    ctx.font = '700 24px "Manrope", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(TT('Create room or join room code', 'Создайте комнату или введите код'), canvas.width / 2, canvas.height / 2);
    return;
  }

  const p = state.game.paddles;
  ctx.fillStyle = primary;
  ctx.fillRect(24, p.hostY, 12, p.h);
  ctx.fillRect(684, p.guestY, 12, p.h);

  const b = state.game.ball;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();

  if (state.game.status === 'waiting') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accent;
    ctx.font = '700 30px "Manrope", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(TT('Waiting for second player...', 'Ожидание второго игрока...'), canvas.width / 2, canvas.height / 2);
  }

  if (state.game.status === 'finished') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = secondary;
    ctx.font = '700 34px "Manrope", sans-serif';
    ctx.textAlign = 'center';
    const won = state.game.winner === state.role;
    ctx.fillText(won ? TT('You Win', 'Победа') : TT('You Lose', 'Поражение'), canvas.width / 2, canvas.height / 2);
  }
}

async function fetchState() {
  if (!state.code) return;
  try {
    const game = await window.requestJson(`/api/multiplayer/pong/state/${encodeURIComponent(state.code)}`, {
      method: 'GET',
    });
    const prevStatus = state.game ? state.game.status : '';
    state.game = game;
    state.role = game.role || state.role;
    if (roomEl) roomEl.textContent = state.code;
    updateScore();

    const enemyName = state.role === 'host' ? game.players.guest : game.players.host;
    if (game.status === 'waiting') setStatus(`${TT('Waiting... Share code', 'Ожидание... отправь код')} ${state.code}`);
    if (game.status === 'playing') setStatus(`${TT('Playing vs', 'Игра против')} ${enemyName || TT('player', 'игрока')}`);
    if (game.status === 'finished') {
      const won = game.winner === state.role;
      setStatus(won ? TT('You won the match', 'Ты выиграл матч') : TT('You lost this match', 'Ты проиграл матч'));
      if (won && !state.rewardGiven && prevStatus !== 'finished' && window.GameSkins) {
        window.GameSkins.awardPoints(40);
        state.rewardGiven = true;
      }
    }
  } catch (error) {
    setMsg(error.message || TT('Failed to sync match.', 'Не удалось синхронизировать матч.'), true);
  }
}

function sendInput(y) {
  if (!state.code) return;
  const now = Date.now();
  if (now - state.lastInputAt < 45) return;
  state.lastInputAt = now;
  window.requestJson('/api/multiplayer/pong/input', {
    method: 'POST',
    body: JSON.stringify({ code: state.code, y }),
  }).catch(() => {});
}

canvas.addEventListener('pointerdown', (event) => {
  if (!state.code) return;
  const p = canvasPoint(event);
  const meY = state.role === 'host'
    ? (state.game?.paddles?.hostY ?? 168)
    : (state.game?.paddles?.guestY ?? 168);
  state.touchDrag = { startY: p.y, startPaddleY: meY };
  sendInput(meY);
});

canvas.addEventListener('pointermove', (event) => {
  if (!state.touchDrag || !state.code) return;
  const p = canvasPoint(event);
  const nextY = Math.max(0, Math.min(420 - 84, state.touchDrag.startPaddleY + (p.y - state.touchDrag.startY)));
  sendInput(nextY);
});

canvas.addEventListener('pointerup', () => {
  state.touchDrag = null;
});
canvas.addEventListener('pointercancel', () => {
  state.touchDrag = null;
});

if (createBtn) {
  createBtn.addEventListener('click', async () => {
    setMsg('');
    try {
      const result = await window.requestJson('/api/multiplayer/pong/create', { method: 'POST' });
      state.code = result.code;
      state.role = result.role;
      state.rewardGiven = false;
      if (roomEl) roomEl.textContent = state.code;
      setStatus(`${TT('Room created', 'Комната создана')}: ${state.code}`);
      setMsg(TT('Room created. Send code to friend.', 'Комната создана. Отправь код другу.'), false);
      await fetchState();
    } catch (error) {
      setMsg(error.message || TT('Failed to create room.', 'Не удалось создать комнату.'), true);
    }
  });
}

if (joinForm) {
  joinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMsg('');
    const fd = new FormData(joinForm);
    const code = String(fd.get('code') || '').trim().toUpperCase();
    if (!code) {
      setMsg(TT('Enter room code.', 'Введите код комнаты.'), true);
      return;
    }
    try {
      const result = await window.requestJson('/api/multiplayer/pong/join', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      state.code = result.code;
      state.role = result.role;
      state.rewardGiven = false;
      if (roomEl) roomEl.textContent = state.code;
      setMsg(TT('Joined room.', 'Вы вошли в комнату.'), false);
      await fetchState();
    } catch (error) {
      setMsg(error.message || TT('Failed to join room.', 'Не удалось войти в комнату.'), true);
    }
  });
}

if (restartBtn) {
  restartBtn.addEventListener('click', async () => {
    if (!state.code) return;
    try {
      await window.requestJson('/api/multiplayer/pong/restart', {
        method: 'POST',
        body: JSON.stringify({ code: state.code }),
      });
      state.rewardGiven = false;
      setMsg(TT('Match restarted.', 'Матч перезапущен.'), false);
    } catch (error) {
      setMsg(error.message || TT('Restart failed.', 'Не удалось перезапустить матч.'), true);
    }
  });
}

setInterval(fetchState, 80);
setInterval(draw, 16);
window.addEventListener('game-skin-change', draw);
draw();
