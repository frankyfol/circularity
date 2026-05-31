import { useEffect, useRef, useCallback } from 'react';

const PALETTE = {
  sky: '#262b44',
  skyClear: '#3b5dc9',
  skySmog: '#5a3e36',
  grass: '#38b764',
  grassDead: '#734722',
  water: '#41a6f6',
  waterDirty: '#5a6988',
  building: '#68386c',
  buildingLit: '#ffcd75',
  road: '#444c63',
  landfill: '#734722',
  garbage: '#b13e53',
  smoke: '#888888',
  fire: '#ff6b35',
  recycle: '#38b764',
  incinerator: '#5d275d',
  citizen: '#ffcd75',
  citizenSad: '#888888',
};

const TILE = 32;
const GRID_W = 10;
const GRID_H = 8;

function drawRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, w * TILE, h * TILE);
}

function drawBuilding(ctx, x, y, lit) {
  drawRect(ctx, x, y, 1, 1, PALETTE.building);
  if (lit) {
    ctx.fillStyle = PALETTE.buildingLit;
    ctx.fillRect(x * TILE + 10, y * TILE + 10, 6, 6);
    ctx.fillRect(x * TILE + 20, y * TILE + 18, 6, 6);
  }
}

function drawTree(ctx, x, y, frame) {
  drawRect(ctx, x, y, 1, 1, PALETTE.grass);
  const sway = Math.sin(frame * 0.1) * 2;
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(x * TILE + 12 + sway, y * TILE + 4, 8, 12);
  ctx.fillRect(x * TILE + 8 + sway, y * TILE + 2, 16, 8);
}

function drawLandfill(ctx, x, y, height) {
  drawRect(ctx, x, y, 1, 1, PALETTE.landfill);
  for (let i = 0; i < height; i++) {
    ctx.fillStyle = PALETTE.garbage;
    ctx.fillRect(x * TILE + 4 + i * 2, y * TILE + 4 - i * 3, 8, 6);
  }
}

function drawIncinerator(ctx, x, y, frame) {
  drawRect(ctx, x, y, 1, 1, PALETTE.incinerator);
  ctx.fillStyle = PALETTE.smoke;
  const puff = Math.floor(frame / 8) % 3;
  ctx.fillRect(x * TILE + 12, y * TILE - 4 - puff * 4, 8, 6);
  ctx.fillStyle = PALETTE.fire;
  ctx.fillRect(x * TILE + 14, y * TILE + 4, 4, 8);
}

function drawRecyclePlant(ctx, x, y) {
  drawRect(ctx, x, y, 1, 1, '#2d5a3d');
  ctx.fillStyle = PALETTE.recycle;
  ctx.font = '16px monospace';
  ctx.fillText('♻', x * TILE + 8, y * TILE + 22);
}

function drawCitizen(ctx, x, y, happy, frame) {
  const bounce = happy ? Math.abs(Math.sin(frame * 0.15)) * 2 : 0;
  ctx.fillStyle = happy ? PALETTE.citizen : PALETTE.citizenSad;
  ctx.fillRect(x * TILE + 12, y * TILE + 16 - bounce, 8, 12);
  ctx.fillRect(x * TILE + 10, y * TILE + 8 - bounce, 12, 8);
}

function drawSmogOverlay(ctx, w, h, intensity, frame) {
  ctx.fillStyle = `rgba(90, 62, 54, ${intensity * 0.4})`;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    const px = ((frame * 0.5 + i * 40) % w);
    ctx.fillStyle = `rgba(136, 136, 136, ${intensity * 0.2})`;
    ctx.fillRect(px, 10 + i * 15, 30, 8);
  }
}

function drawCircularityArrows(ctx, w, h, frame) {
  ctx.strokeStyle = PALETTE.recycle;
  ctx.lineWidth = 2;
  const cx = w / 2;
  const cy = h / 2;
  const r = 20;
  const start = (frame * 0.05) % (Math.PI * 2);
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, start + Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = PALETTE.recycle;
  ctx.fillText('♻', cx + r - 8, cy - r);
}

export default function CityCanvas({ pillars, builtAssets = [], animation = null, className = '' }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const animRef = useRef(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scale = 2;
    canvas.width = GRID_W * TILE * scale;
    canvas.height = GRID_H * TILE * scale;
    ctx.scale(scale, scale);

    const frame = frameRef.current;
    const env = pillars.environment;
    const liv = pillars.liveability;
    const cap = pillars.capacity;
    const circ = pillars.circularity;

    const skyColor = env > 60 ? PALETTE.skyClear : env > 30 ? PALETTE.sky : PALETTE.skySmog;
    drawRect(ctx, 0, 0, GRID_W, 3, skyColor);

    const waterColor = env > 50 ? PALETTE.water : PALETTE.waterDirty;
    drawRect(ctx, 0, 5, GRID_W, 1, waterColor);

    const grassColor = env > 40 ? PALETTE.grass : PALETTE.grassDead;
    for (let x = 0; x < GRID_W; x++) {
      for (let y = 3; y < 5; y++) {
        drawRect(ctx, x, y, 1, 1, grassColor);
      }
    }

    drawRect(ctx, 0, 6, GRID_W, 2, PALETTE.road);

    for (let i = 0; i < 4; i++) {
      drawBuilding(ctx, 1 + i * 2, 3, liv > 50);
    }

    if (env > 55) {
      drawTree(ctx, 8, 3, frame);
      drawTree(ctx, 9, 4, frame);
    }

    const landfillHeight = Math.max(0, Math.round((100 - cap) / 15));
    if (landfillHeight > 0) {
      drawLandfill(ctx, 8, 6, Math.min(landfillHeight, 4));
    }

    if (builtAssets.some((a) => a.includes('incinerator') || a.includes('waste-to-energy'))) {
      drawIncinerator(ctx, 0, 3, frame);
    }

    if (builtAssets.some((a) => a.includes('source-separation') || a.includes('green-exchange') || a.includes('integrate'))) {
      drawRecyclePlant(ctx, 0, 6);
    }

    if (liv > 40) {
      drawCitizen(ctx, 4, 6, liv > 60, frame);
      drawCitizen(ctx, 6, 6, liv > 55, frame + 10);
    }

    if (env < 40) {
      drawSmogOverlay(ctx, GRID_W * TILE, GRID_H * TILE, (40 - env) / 40, frame);
    }

    if (circ > 50) {
      drawCircularityArrows(ctx, GRID_W * TILE, GRID_H * TILE, frame);
    }

    if (animation === 'landfill') {
      ctx.fillStyle = PALETTE.garbage;
      const truckX = ((frame % 60) / 60) * GRID_W * TILE;
      ctx.fillRect(truckX, 6 * TILE + 8, 24, 16);
    }
    if (animation === 'incinerate') {
      drawIncinerator(ctx, 0, 3, frame);
    }
    if (animation === 'landfill-fire') {
      ctx.fillStyle = PALETTE.fire;
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(8 * TILE + i * 3, 5 * TILE - (frame % 10), 6, 10);
      }
    }
    if (animation === 'market-crash') {
      ctx.fillStyle = PALETTE.garbage;
      for (let i = 0; i < 5; i++) {
        const fy = ((frame + i * 15) % 80);
        ctx.fillText('💸', 20 + i * 30, fy + 20);
      }
    }
  }, [pillars, builtAssets, animation]);

  useEffect(() => {
    const loop = () => {
      frameRef.current += 1;
      render();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full max-w-md mx-auto border-4 border-pixel-border ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
