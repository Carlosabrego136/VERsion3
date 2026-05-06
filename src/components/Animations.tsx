import { useEffect, useRef } from 'react';
import { AnimationType } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  life: number;
  maxLife: number;
  phase: number;
}

const COLORS: Record<string, string[]> = {
  butterflies: ['#d4af37', '#c9956b', '#e8c87a', '#f5deb3', '#deb887'],
  stars: ['#d4af37', '#ffd700', '#fff8dc', '#f5deb3', '#ffe4b5'],
  petals: ['#ffb6c1', '#ffc0cb', '#ff69b4', '#f5deb3', '#ffe4e1'],
  sparkles: ['#d4af37', '#ffd700', '#ffffff', '#fff8dc', '#ffe4b5'],
  hearts: ['#d4af37', '#c9956b', '#e8c87a', '#deb887', '#f5deb3'],
  confetti: ['#d4af37', '#c9956b', '#e8c87a', '#deb887', '#f5deb3', '#ff6b6b', '#4ecdc4'],
  leaves: ['#8fbc8f', '#6b8e23', '#9acd32', '#bdb76b', '#d4af37'],
};

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, type: AnimationType) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.opacity * (p.life / p.maxLife);

  switch (type) {
    case 'butterflies':
      drawButterfly(ctx, p);
      break;
    case 'stars':
      drawStar(ctx, p);
      break;
    case 'petals':
      drawPetal(ctx, p);
      break;
    case 'sparkles':
      drawSparkle(ctx, p);
      break;
    case 'hearts':
      drawHeart(ctx, p);
      break;
    case 'confetti':
      drawConfetti(ctx, p);
      break;
    case 'leaves':
      drawLeaf(ctx, p);
      break;
  }

  ctx.restore();
}

function drawButterfly(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  const wingFlap = Math.sin(p.phase) * 0.5;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.ellipse(-s * 0.4, 0, s * 0.5, s * 0.3 * (0.5 + wingFlap), -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.4, 0, s * 0.5, s * 0.3 * (0.5 + wingFlap), 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillRect(-1, -s * 0.3, 2, s * 0.6);
}

function drawStar(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](Math.cos(angle) * s, Math.sin(angle) * s);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.3, s * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSparkle(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  const pulse = 0.7 + Math.sin(p.phase) * 0.3;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle - 0.15) * s * 0.3, Math.sin(angle - 0.15) * s * 0.3);
    ctx.lineTo(Math.cos(angle) * s * pulse, Math.sin(angle) * s * pulse);
    ctx.lineTo(Math.cos(angle + 0.15) * s * 0.3, Math.sin(angle + 0.15) * s * 0.3);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.1, 0, s);
  ctx.bezierCurveTo(s, s * 0.1, s * 0.5, -s * 0.3, 0, s * 0.3);
  ctx.fill();
}

function drawConfetti(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.fillStyle = p.color;
  ctx.fillRect(-s * 0.4, -s * 0.15, s * 0.8, s * 0.3);
}

function drawLeaf(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.bezierCurveTo(s * 0.5, -s * 0.5, s * 0.5, s * 0.5, 0, s);
  ctx.bezierCurveTo(-s * 0.5, s * 0.5, -s * 0.5, -s * 0.5, 0, -s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.8);
  ctx.lineTo(0, s * 0.8);
  ctx.stroke();
}

interface AnimationCanvasProps {
  animation: AnimationType;
  accentColor?: string;
}

export default function AnimationCanvas({ animation }: AnimationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (animation === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = COLORS[animation] || COLORS.sparkles;
    let animId: number;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0.3 + Math.random() * 0.7,
      size: 4 + Math.random() * 8,
      opacity: 0.4 + Math.random() * 0.6,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 300 + Math.random() * 200,
      maxLife: 500,
      phase: Math.random() * Math.PI * 2,
    });

    // Initialize particles
    particlesRef.current = Array.from({ length: 25 }, () => {
      const p = createParticle();
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      return p;
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(p => {
        p.x += p.vx + Math.sin(p.phase) * 0.3;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.phase += 0.05;
        p.life -= 1;

        if (p.life <= 0 || p.y > canvas.height + 20) {
          Object.assign(p, createParticle());
        }

        drawParticle(ctx, p, animation);
      });

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [animation]);

  if (animation === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
