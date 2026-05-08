import { useState, useEffect, useRef, useCallback } from 'react';
import { EventData, TableData, GuestData, LocationMarker } from '../types';
import { getEvent, getTables, getLocationMarkers, getGuests } from '../store';

interface GuestPageProps { eventId: string; }

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap');
  .guest-root { font-family:'Montserrat',sans-serif; background:#050a15; min-height:100vh; color:#e8f0fe; }
  .aurora-bg { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
  .aurora-bg::before {
    content:''; position:absolute; width:120%; height:120%; top:-10%; left:-10%;
    background:radial-gradient(ellipse 80% 60% at 20% 20%,rgba(14,60,120,.55) 0%,transparent 60%),
               radial-gradient(ellipse 60% 80% at 80% 80%,rgba(6,30,80,.5) 0%,transparent 60%);
    animation:auroraA 18s ease-in-out infinite alternate;
  }
  .aurora-bg::after {
    content:''; position:absolute; inset:0;
    background:radial-gradient(ellipse 40% 30% at 70% 30%,rgba(30,100,200,.18) 0%,transparent 60%),
               radial-gradient(ellipse 30% 40% at 30% 70%,rgba(10,50,140,.15) 0%,transparent 60%);
    animation:auroraB 22s ease-in-out infinite alternate;
  }
  @keyframes auroraA { 0%{transform:scale(1) rotate(0deg)} 100%{transform:scale(1.05) rotate(2deg)} }
  @keyframes auroraB { 0%{transform:scale(1.05) rotate(-1deg)} 100%{transform:scale(1) rotate(1deg)} }
  .stars { position:fixed; inset:0; z-index:0; pointer-events:none; }
  .star { position:absolute; background:white; border-radius:50%; animation:twinkle var(--dur) ease-in-out infinite alternate; opacity:0; }
  @keyframes twinkle { 0%{opacity:0;transform:scale(.8)} 100%{opacity:var(--op);transform:scale(1.2)} }
  .gold-line { height:1px; background:linear-gradient(90deg,transparent,rgba(212,175,55,.6),rgba(212,175,55,.9),rgba(212,175,55,.6),transparent); }
  .glass-card { background:rgba(10,25,60,.65); border:1px solid rgba(100,150,255,.15); backdrop-filter:blur(20px); box-shadow:0 8px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(100,150,255,.1); border-radius:20px; }
  .search-input { background:rgba(6,20,55,.8); border:1px solid rgba(80,130,255,.2); color:#e8f0fe; border-radius:12px; padding:14px 18px; width:100%; font-family:'Montserrat',sans-serif; font-size:14px; font-weight:300; outline:none; transition:all .3s ease; box-sizing:border-box; }
  .search-input::placeholder { color:rgba(140,170,255,.4); }
  .search-input:focus { border-color:rgba(180,150,55,.5); box-shadow:0 0 0 3px rgba(180,150,55,.08); }
  .btn-primary { background:linear-gradient(135deg,#1a4a9e,#0d2d6e,#1a3a8a); border:1px solid rgba(180,150,55,.4); color:#f0d060; font-family:'Montserrat',sans-serif; font-weight:500; font-size:13px; letter-spacing:.08em; text-transform:uppercase; padding:14px 28px; border-radius:12px; cursor:pointer; transition:all .3s ease; box-shadow:0 4px 20px rgba(10,30,100,.4); width:100%; }
  .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
  .btn-ghost { background:rgba(10,25,70,.5); border:1px solid rgba(80,130,255,.2); color:rgba(180,210,255,.7); font-family:'Montserrat',sans-serif; font-weight:400; font-size:12px; letter-spacing:.06em; padding:12px 20px; border-radius:10px; cursor:pointer; transition:all .3s ease; }
  .btn-gold { background:linear-gradient(135deg,rgba(180,150,55,.2),rgba(212,175,55,.15)); border:1px solid rgba(212,175,55,.4); color:#d4af37; font-family:'Montserrat',sans-serif; font-weight:500; font-size:12px; letter-spacing:.08em; text-transform:uppercase; padding:12px 20px; border-radius:10px; cursor:pointer; transition:all .3s ease; }
  .guest-name { font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; font-size:clamp(2rem,8vw,3.2rem); background:linear-gradient(135deg,#a8c4ff 0%,#e8f0fe 40%,#d4af37 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1.2; }
  .table-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(180,150,55,.12); border:1px solid rgba(180,150,55,.3); color:#d4af37; font-size:12px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; padding:6px 16px; border-radius:100px; }
  .media-container { position:relative; width:100%; border-radius:16px; overflow:hidden; background:#000; box-shadow:0 8px 40px rgba(0,0,0,.6),0 0 0 1px rgba(100,150,255,.1); }
  .media-container video,.media-container img { width:100%; display:block; max-height:72vh; object-fit:contain; }
  .map-canvas-wrap { position:relative; border-radius:16px; overflow:hidden; background:#07152e; border:1px solid rgba(80,130,255,.15); box-shadow:0 8px 40px rgba(0,0,0,.5); touch-action:none; }
  .map-fullscreen { position:fixed!important; inset:0!important; border-radius:0!important; z-index:9999!important; }
  .map-btn { background:rgba(8,20,55,.92); border:1px solid rgba(80,130,255,.25); color:#a0c0ff; font-family:'Montserrat',sans-serif; cursor:pointer; backdrop-filter:blur(10px); }
  .spinner { width:44px; height:44px; border:2px solid rgba(80,130,255,.15); border-top-color:#d4af37; border-right-color:rgba(80,130,255,.6); border-radius:50%; animation:spin 1s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }
  .fade-in { animation:fadeIn .6s ease forwards; }
  .fade-in-up { animation:fadeInUp .7s ease forwards; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .ornament { display:flex; align-items:center; gap:12px; color:rgba(180,150,55,.5); font-size:10px; letter-spacing:.2em; }
  .ornament::before,.ornament::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(180,150,55,.3)); }
  .ornament::after { background:linear-gradient(90deg,rgba(180,150,55,.3),transparent); }
  label.field-label { display:block; font-size:10px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; color:rgba(140,170,255,.6); margin-bottom:8px; }

  /* ── REVEAL ANIMATION ── */
  @keyframes revealTableNum {
    0%   { opacity:0; transform:scale(0.4) translateY(30px); filter:blur(12px); }
    60%  { opacity:1; transform:scale(1.08) translateY(-4px); filter:blur(0); }
    100% { opacity:1; transform:scale(1) translateY(0); filter:blur(0); }
  }
  @keyframes revealLabel {
    0%   { opacity:0; letter-spacing:.6em; transform:translateY(8px); }
    100% { opacity:1; letter-spacing:.22em; transform:translateY(0); }
  }
  @keyframes revealName {
    0%   { opacity:0; transform:translateY(24px); filter:blur(6px); }
    100% { opacity:1; transform:translateY(0); filter:blur(0); }
  }
  @keyframes revealLine {
    0%   { transform:scaleX(0); opacity:0; }
    100% { transform:scaleX(1); opacity:1; }
  }
  @keyframes revealSubtitle {
    0%   { opacity:0; transform:translateY(10px); }
    100% { opacity:1; transform:translateY(0); }
  }
  @keyframes revealButtons {
    0%   { opacity:0; transform:translateY(14px); }
    100% { opacity:1; transform:translateY(0); }
  }
  @keyframes pulseGold {
    0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,0), 0 0 40px rgba(212,175,55,.15), 0 0 80px rgba(212,175,55,.06); }
    50%      { box-shadow: 0 0 0 22px rgba(212,175,55,0), 0 0 70px rgba(212,175,55,.35), 0 0 120px rgba(212,175,55,.12); }
  }
  @keyframes orbFloat {
    0%,100% { transform: translateY(0) scale(1); opacity:.55; }
    50%      { transform: translateY(-18px) scale(1.06); opacity:.75; }
  }
  @keyframes spinRingSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes spinRingReverse {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
  }
  @keyframes circleEntrance {
    0%   { opacity:0; transform:scale(0.3) rotate(-20deg); filter:blur(20px); }
    55%  { opacity:1; transform:scale(1.1) rotate(4deg); filter:blur(0); }
    75%  { transform:scale(0.96) rotate(-1deg); }
    100% { opacity:1; transform:scale(1) rotate(0deg); filter:blur(0); }
  }
  @keyframes numberPop {
    0%   { opacity:0; transform:scale(0.5); filter:blur(8px); }
    65%  { opacity:1; transform:scale(1.12); filter:blur(0); }
    100% { opacity:1; transform:scale(1); }
  }
  /* Light sweep across the circle */
  @keyframes lightSweep {
    0%   { transform: rotate(-60deg) translateX(-120px); opacity:0; }
    15%  { opacity:.55; }
    85%  { opacity:.55; }
    100% { transform: rotate(-60deg) translateX(120px); opacity:0; }
  }
  /* Particle orbit around the circle */
  @keyframes orbitDot {
    from { transform: rotate(var(--start)) translateX(100px) rotate(calc(-1 * var(--start))); }
    to   { transform: rotate(calc(var(--start) + 360deg)) translateX(100px) rotate(calc(-1 * (var(--start) + 360deg))); }
  }
  /* Particle fade in then maintain */
  @keyframes particleFade {
    0%   { opacity:0; transform:scale(0); }
    30%  { opacity:var(--max-op); transform:scale(1); }
    70%  { opacity:var(--max-op); }
    100% { opacity:calc(var(--max-op) * 0.4); transform:scale(0.7); }
  }
  /* Name shimmer */
  @keyframes nameShimmer {
    0%   { opacity:0; transform:translateY(20px); filter:blur(8px); }
    60%  { opacity:1; transform:translateY(0); filter:blur(0); }
    100% { opacity:1; transform:translateY(0); filter:blur(0); }
  }
  /* Subtle shimmer pass on name */
  @keyframes textGlow {
    0%,100% { filter: drop-shadow(0 0 0px rgba(212,175,55,0)); }
    50%      { filter: drop-shadow(0 0 8px rgba(212,175,55,.35)); }
  }
  /* Outer ring pulse opacity */
  @keyframes ringBreath {
    0%,100% { opacity:.3; }
    50%      { opacity:.7; }
  }
  .reveal-table-num {
    animation: circleEntrance 1.1s cubic-bezier(.22,.9,.36,1) 0.3s both,
               pulseGold 3.5s ease-in-out 1.6s infinite;
  }
  .reveal-table-num .ring-outer {
    animation: spinRingSlow 12s linear infinite, ringBreath 3s ease-in-out infinite;
  }
  .reveal-table-num .ring-inner {
    animation: spinRingReverse 8s linear infinite;
  }
  .reveal-table-num .num-text {
    animation: numberPop 0.7s cubic-bezier(.22,.9,.36,1) 0.9s both;
  }
  .reveal-table-num .light-sweep {
    animation: lightSweep 2.2s ease-in-out 1.2s both;
  }
  .orbit-dot {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    animation: orbitDot var(--dur) linear var(--delay) infinite,
               particleFade 1.2s ease var(--delay) both;
  }
  .reveal-label {
    animation: revealLabel 0.7s ease 1.1s both;
  }
  .reveal-line {
    animation: revealLine 0.6s ease 1.8s both;
    transform-origin: center;
  }
  .reveal-name {
    animation: nameShimmer 0.9s cubic-bezier(.22,.9,.36,1) 2.1s both;
  }
  .reveal-name h1 {
    animation: textGlow 3s ease-in-out 3.2s infinite;
  }
  .reveal-subtitle {
    animation: revealSubtitle 0.6s ease 2.7s both;
  }
  .reveal-buttons {
    animation: revealButtons 0.6s ease 3.2s both;
  }
  .pulse-gold {
    animation: pulseGold 3.5s ease-in-out infinite;
  }
  .orb-float {
    animation: orbFloat 6s ease-in-out infinite;
  }
`;

function StarField() {
  const stars = Array.from({ length: 55 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 1.8 + 0.4,
    dur: (Math.random() * 4 + 2).toFixed(1),
    op: (Math.random() * 0.5 + 0.15).toFixed(2),
    delay: (Math.random() * 6).toFixed(1),
  }));
  return (
    <div className= "stars" >
    {
      stars.map(s => (
        <div key= { s.id } className = "star" style = {{
          left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size,
          '--dur': `${s.dur}s`, '--op': s.op, animationDelay: `${s.delay}s`,
        } as React.CSSProperties} />
      ))
}
</div>
  );
}

// ── SAFARI COMPAT: roundRect polyfill ────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── CANVAS MAP ───────────────────────────────────────────────────────────────
interface CanvasMapProps {
  tables: TableData[];
  markers: LocationMarker[];
  myTableId?: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onCenterMyTable: () => void;
  getMarkerIcon: (type: string) => string;
}

function CanvasMap({ tables, markers, myTableId, fullscreen, onToggleFullscreen, onCenterMyTable, getMarkerIcon }: CanvasMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ zoom: 0.5, ox: 0, oy: 0, dragging: false, lastX: 0, lastY: 0, glowPhase: 0 });
  const rafRef = useRef<number>(0);
  const [zoom, setZoom] = useState(0.5);

  const getMarkerEmoji = useCallback((type: string) => {
    const map: Record<string, string> = {
      entrance: '🚪', exit: '🚶', stage: '🎤', bar: '🍸',
      dancefloor: '💃', buffet: '🍽️', restroom: '🚻', dj: '🎧',
    };
    return map[type] || '📍';
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const { zoom: z, ox, oy, glowPhase } = stateRef.current;

    // Grid
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#6496ff';
    const gridSize = 32 * z;
    const startX = ((ox % gridSize) + gridSize) % gridSize;
    const startY = ((oy % gridSize) + gridSize) % gridSize;
    for (let x = startX; x < w; x += gridSize) {
      for (let y = startY; y < h; y += gridSize) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(z, z);

    for (const t of tables) {
      const isMine = t.id === myTableId;
      const x = t.position.x, y = t.position.y;
      const w2 = t.size.width, h2 = t.size.height;
      const isRound = t.shape === 'round' || t.shape === 'oval';
      const r = isRound ? Math.min(w2, h2) / 2 : 8;

      ctx.save();

      if (isMine) {
        const glow = 0.5 + 0.5 * Math.sin(glowPhase);
        const grad = ctx.createRadialGradient(x + w2 / 2, y + h2 / 2, 0, x + w2 / 2, y + h2 / 2, Math.max(w2, h2));
        grad.addColorStop(0, `rgba(212,175,55,${0.15 + glow * 0.12})`);
        grad.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.beginPath();
        if (isRound) { ctx.ellipse(x + w2 / 2, y + h2 / 2, w2 / 2 + 14, h2 / 2 + 14, 0, 0, Math.PI * 2); }
        else { roundRect(ctx, x - 10, y - 10, w2 + 20, h2 + 20, r + 4); }
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      if (isRound) { ctx.ellipse(x + w2 / 2, y + h2 / 2, w2 / 2, h2 / 2, 0, 0, Math.PI * 2); }
      else { roundRect(ctx, x, y, w2, h2, r); }
      ctx.fillStyle = isMine ? 'rgba(212,175,55,0.18)' : 'rgba(10,30,80,0.75)';
      ctx.fill();

      ctx.strokeStyle = isMine ? `rgba(212,175,55,${0.7 + 0.3 * Math.sin(glowPhase)})` : 'rgba(80,130,255,0.28)';
      ctx.lineWidth = isMine ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = isMine ? '#d4af37' : 'rgba(140,170,255,0.8)';
      ctx.font = `700 ${Math.round(10 / z * z)}px Montserrat, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, x + w2 / 2, y + h2 / 2 - (isMine ? 6 : 0));

      if (isMine) {
        ctx.fillStyle = 'rgba(212,175,55,0.7)';
        ctx.font = `500 8px Montserrat, sans-serif`;
        ctx.fillText('MY TABLE', x + w2 / 2, y + h2 / 2 + 8);
      }

      ctx.restore();
    }

    for (const m of markers) {
      ctx.save();
      ctx.font = '14px serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const emoji = getMarkerEmoji(m.markerType);
      const label = m.label;
      const textW = ctx.measureText(label).width;
      const padX = 10, padY = 5;
      const bw = 16 + textW + padX * 2;
      const bh = 24;

      ctx.fillStyle = 'rgba(8,20,55,0.88)';
      ctx.strokeStyle = 'rgba(80,130,255,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundRect(ctx, m.position.x, m.position.y, bw, bh, 12);
      ctx.fill(); ctx.stroke();

      ctx.fillText(emoji, m.position.x + padX, m.position.y + bh / 2);
      ctx.fillStyle = 'rgba(180,210,255,0.85)';
      ctx.font = '500 11px Montserrat, sans-serif';
      ctx.fillText(label, m.position.x + padX + 16, m.position.y + bh / 2);

      ctx.restore();
    }

    ctx.restore();
  }, [tables, markers, myTableId, getMarkerEmoji]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      stateRef.current.glowPhase += 0.04;
      draw();
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  useEffect(() => {
    const myTable = tables.find(t => t.id === myTableId);
    if (!myTable || !containerRef.current) return;

    const center = () => {
      const cw = containerRef.current?.clientWidth || 0;
      const ch = containerRef.current?.clientHeight || 0;
      if (cw === 0 || ch === 0) {
        setTimeout(center, 50);
        return;
      }
      const z = 0.8;
      stateRef.current.zoom = z;
      stateRef.current.ox = cw / 2 - (myTable.position.x + myTable.size.width / 2) * z;
      stateRef.current.oy = ch / 2 - (myTable.position.y + myTable.size.height / 2) * z;
      setZoom(z);
    };

    // Delay to let iOS Safari finish painting the layout before reading dimensions
    setTimeout(center, 100);
  }, [tables, myTableId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    stateRef.current.dragging = true;
    stateRef.current.lastX = e.clientX;
    stateRef.current.lastY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stateRef.current.dragging) return;
    stateRef.current.ox += e.clientX - stateRef.current.lastX;
    stateRef.current.oy += e.clientY - stateRef.current.lastY;
    stateRef.current.lastX = e.clientX;
    stateRef.current.lastY = e.clientY;
  };
  const handlePointerUp = () => { stateRef.current.dragging = false; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZ = Math.max(0.2, Math.min(2, stateRef.current.zoom * delta));
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    stateRef.current.ox = mx - (mx - stateRef.current.ox) * (newZ / stateRef.current.zoom);
    stateRef.current.oy = my - (my - stateRef.current.oy) * (newZ / stateRef.current.zoom);
    stateRef.current.zoom = newZ;
    setZoom(newZ);
  };

  const zoomIn = () => { const newZ = Math.min(2, stateRef.current.zoom + 0.15); stateRef.current.zoom = newZ; setZoom(newZ); };
  const zoomOut = () => { const newZ = Math.max(0.2, stateRef.current.zoom - 0.15); stateRef.current.zoom = newZ; setZoom(newZ); };

  const handleCenter = () => {
    const myTable = tables.find(t => t.id === myTableId);
    if (myTable && containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      stateRef.current.zoom = 0.9;
      stateRef.current.ox = cw / 2 - (myTable.position.x + myTable.size.width / 2) * 0.9;
      stateRef.current.oy = ch / 2 - (myTable.position.y + myTable.size.height / 2) * 0.9;
      setZoom(0.9);
    }
    onCenterMyTable();
  };

  return (
    <div
      ref= { containerRef }
  className = {`map-canvas-wrap${fullscreen ? ' map-fullscreen' : ''}`
}
style = {{ height: fullscreen ? '100vh' : '58vh', cursor: 'grab' }}
onPointerDown = { handlePointerDown }
onPointerMove = { handlePointerMove }
onPointerUp = { handlePointerUp }
onPointerLeave = { handlePointerUp }
onWheel = { handleWheel }
  >
  <canvas ref={ canvasRef } style = {{ display: 'block', width: '100%', height: '100%' }} />

    < div style = {{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20 }}>
    {
      [{ l: '+', fn: zoomIn }, { l: '−', fn: zoomOut }].map(b => (
        <button key= { b.l } className = "map-btn" onClick = { b.fn } style = {{
        width: 44, height: 44, fontSize: 20, fontWeight: 300, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} > { b.l } < /button>
        ))}
</div>

  < button className = "map-btn" onClick = { onToggleFullscreen } style = {{
  position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
    fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '8px 18px', borderRadius: 10, whiteSpace: 'nowrap',
      }}>
  { fullscreen? '✕ Cerrar': '⛶ Expandir' }
  < /button>

  < button onClick = { handleCenter } style = {{
  position: 'absolute', top: 12, left: 12, zIndex: 20,
    background: 'linear-gradient(135deg,rgba(180,150,55,.2),rgba(150,120,40,.15))',
      border: '1px solid rgba(212,175,55,.4)', color: '#d4af37',
        fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', backdropFilter: 'blur(10px)',
      }}>✦ My table < /button>

  < div style = {{
  position: 'absolute', bottom: 16, left: 16, zIndex: 20,
    background: 'rgba(8,20,55,.7)', border: '1px solid rgba(80,130,255,.15)',
      color: 'rgba(140,170,255,.5)', fontSize: 10, letterSpacing: '0.1em',
        padding: '5px 10px', borderRadius: 8,
      }}> { Math.round(zoom * 100) } % </div>
  < /div>
  );
}

// ── REVEAL SCREEN ────────────────────────────────────────────────────────────
interface RevealScreenProps {
  guest: GuestData;
  table: TableData | null;
  eventName: string;
  onContinue: () => void;
}

function RevealScreen({ guest, table, eventName, onContinue }: RevealScreenProps) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Show button after full animation sequence (~3.6s)
    const t = setTimeout(() => setShowButton(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style= {{
    position: 'fixed', inset: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px',
            background: 'transparent',
    }
}>
  {/* Decorative orbs */ }
  < div className = "orb-float" style = {{
  position: 'absolute', top: '15%', left: '10%',
    width: 180, height: 180, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(212,175,55,.12) 0%, transparent 70%)',
        pointerEvents: 'none',
          animationDelay: '0s',
      }} />
  < div className = "orb-float" style = {{
  position: 'absolute', bottom: '18%', right: '8%',
    width: 140, height: 140, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(80,130,255,.1) 0%, transparent 70%)',
        pointerEvents: 'none',
          animationDelay: '2s',
      }} />

{/* Event name */ }
<p className="reveal-label" style = {{
  fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase',
    color: 'rgba(180,150,55,.65)', marginBottom: 32, textAlign: 'center',
      }}>
        ✦ { eventName } ✦
</p>

{/* Mesa label */ }
<p style={
  {
    fontSize: 11, letterSpacing: '.35em', textTransform: 'uppercase',
      color: 'rgba(140,170,255,.45)', marginBottom: 12, textAlign: 'center',
        opacity: 0,
          animation: 'revealSubtitle 0.6s ease 0.1s both',
      }
}>
  your table
    < /p>

{/* Big table number */ }
<div style={ { position: 'relative', marginBottom: 28, width: 172, height: 172 } }>

  {/* Orbiting particles around the circle */ }
{
  [
    { start: '0deg', dur: '6s', delay: '1.4s', size: 4, op: '.7' },
    { start: '72deg', dur: '8s', delay: '1.7s', size: 3, op: '.5' },
    { start: '144deg', dur: '7s', delay: '2.0s', size: 5, op: '.6' },
    { start: '216deg', dur: '9s', delay: '1.5s', size: 3, op: '.4' },
    { start: '288deg', dur: '6.5s', delay: '2.2s', size: 4, op: '.55' },
    { start: '36deg', dur: '11s', delay: '1.9s', size: 2.5, op: '.35' },
    { start: '180deg', dur: '10s', delay: '2.4s', size: 2.5, op: '.3' },
  ].map((p, i) => (
    <div key= { i } className = "orbit-dot" style = {{
      width: p.size, height: p.size,
      background: i % 2 === 0 ? '#d4af37' : 'rgba(180,210,255,.9)',
      top: '50%', left: '50%',
      marginTop: -p.size / 2, marginLeft: -p.size / 2,
      boxShadow: i % 2 === 0
        ? `0 0 ${p.size * 2}px rgba(212,175,55,.8)`
        : `0 0 ${p.size * 2}px rgba(140,180,255,.6)`,
      '--start': p.start,
      '--dur': p.dur,
      '--delay': p.delay,
      '--max-op': p.op,
    } as React.CSSProperties} />
        ))}

<div className="reveal-table-num" style = {{
  width: 172, height: 172, borderRadius: '50%',
    background: 'radial-gradient(circle at 38% 32%, rgba(212,175,55,.22) 0%, rgba(8,18,55,.92) 55%, rgba(4,10,35,.98) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
          backdropFilter: 'blur(14px)',
        }}>
  {/* Outer spinning dashed ring */ }
  < div className = "ring-outer" style = {{
  position: 'absolute', inset: -6, borderRadius: '50%',
    border: '1.5px dashed rgba(212,175,55,.3)',
      pointerEvents: 'none',
          }} />
{/* Main border */ }
<div style={
  {
    position: 'absolute', inset: 0, borderRadius: '50%',
      border: '2px solid rgba(212,175,55,.55)',
        pointerEvents: 'none',
          }
} />
{/* Inner spinning ring */ }
<div className="ring-inner" style = {{
  position: 'absolute', inset: 10, borderRadius: '50%',
    border: '1px solid rgba(212,175,55,.18)',
      borderTopColor: 'rgba(212,175,55,.5)',
        pointerEvents: 'none',
          }} />
{/* Innermost subtle ring */ }
<div style={
  {
    position: 'absolute', inset: 18, borderRadius: '50%',
      border: '1px solid rgba(212,175,55,.08)',
        pointerEvents: 'none',
          }
} />
{/* Light sweep — diagonal shine that passes once */ }
<div className="light-sweep" style = {{
  position: 'absolute',
    top: '-20%', left: '50%',
      width: 28, height: '140%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(255,240,180,.45) 40%, rgba(255,255,255,.25) 50%, rgba(255,240,180,.45) 60%, transparent 100%)',
          borderRadius: 12,
            pointerEvents: 'none',
              zIndex: 2,
          }} />
{/* Number */ }
<span className="num-text" style = {{
  fontFamily: 'Montserrat, sans-serif',
    fontWeight: 600,
      fontSize: table?.label && table.label.length > 3 ? 'clamp(2rem,10vw,3.2rem)' : 'clamp(3.2rem,15vw,5rem)',
        background: 'linear-gradient(160deg, #fff8dc 0%, #f5e090 25%, #d4af37 55%, #a07c20 100%)',
          WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
                lineHeight: 1,
                  letterSpacing: '0em',
                    position: 'relative', zIndex: 3,
                      textAlign: 'center',
                        filter: 'drop-shadow(0 2px 12px rgba(212,175,55,.4))',
          }}>
  { table?.label || '—'}
</span>
  < /div>
  < /div>

{/* Divider line */ }
<div className="reveal-line gold-line" style = {{ width: '60%', maxWidth: 200, marginBottom: 28 }} />

{/* Guest name */ }
<div className="reveal-name" style = {{ textAlign: 'center', marginBottom: 10 }}>
  <h1 className="guest-name" style = {{
  fontSize: 'clamp(1.8rem,7vw,2.8rem)',
    margin: 0,
        }}>
  { guest.name } { guest.surname }
</h1>
  < /div>

{/* Bienvenido */ }
<p className="reveal-subtitle" style = {{
  fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase',
    color: 'rgba(140,170,255,.4)', marginBottom: 44, textAlign: 'center',
      }}>
  welcome
  < /p>

{/* CTA button */ }
{
  showButton && (
    <div className="reveal-buttons" style = {{ width: '100%', maxWidth: 280 }
}>
  <button
            onClick={ onContinue }
style = {{
  width: '100%',
    background: 'linear-gradient(135deg, rgba(180,150,55,.25), rgba(212,175,55,.15))',
      border: '1px solid rgba(212,175,55,.5)',
        color: '#d4af37',
          fontFamily: 'Montserrat, sans-serif',
            fontWeight: 500,
              fontSize: 12,
                letterSpacing: '.14em',
                  textTransform: 'uppercase',
                    padding: '15px 28px',
                      borderRadius: 12,
                        cursor: 'pointer',
                          backdropFilter: 'blur(10px)',
                            transition: 'all .3s ease',
            }}
onMouseEnter = { e => {
  (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(212,175,55,.35), rgba(180,150,55,.25))';
  (e.target as HTMLElement).style.borderColor = 'rgba(212,175,55,.8)';
}}
onMouseLeave = { e => {
  (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(180,150,55,.25), rgba(212,175,55,.15))';
  (e.target as HTMLElement).style.borderColor = 'rgba(212,175,55,.5)';
}}
          >
  View my seat on the map ✦
</button>
  < /div>
      )}
</div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function GuestPage({ eventId }: GuestPageProps) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchSurname, setSearchSurname] = useState('');
  const [foundGuest, setFoundGuest] = useState<GuestData | null>(null);
  const [foundTable, setFoundTable] = useState<TableData | null>(null);
  // Nueva fase: 'reveal' entre búsqueda y mapa
  const [phase, setPhase] = useState<'loading' | 'search' | 'reveal' | 'media' | 'map'>('loading');
  const [searching, setSearching] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [ev, t, g, m] = await Promise.all([
          getEvent(eventId), getTables(eventId), getGuests(eventId), getLocationMarkers(eventId)
        ]);
        if (!ev) { setLoadError('Event not found'); return; }
        setEvent(ev); setTables(t); setGuests(g); setMarkers(m);
        setPhase('search');
      } catch { setLoadError('Error loading event'); }
    };
    load();
  }, [eventId]);

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    try {
      const n = searchName.trim().toLowerCase();
      const s = searchSurname.trim().toLowerCase();
      const found = guests.find(g =>
        g.name.toLowerCase() === n && (s === '' || g.surname.toLowerCase() === s)
      );
      if (found) {
        setFoundGuest(found);
        const table = tables.find(t => t.id === found.tableId) || null;
        setFoundTable(table);
        // Siempre va a reveal primero
        setPhase('reveal');
      } else {
        alert('Guest not found. Please check your name and last name.');
      }
    } catch { alert('Search error. Please try again.'); }
    setSearching(false);
  };

  // Después del reveal, decide si va a media o mapa
  const handleRevealContinue = () => {
    if (foundTable?.videoUrl) {
      setPhase('media');
    } else {
      setPhase('map');
    }
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url);

  const getEmbedUrl = (url: string) => {
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&color=d4af37&title=0&byline=0&portrait=0`;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
    return null;
  };

  const getMarkerIcon = (type: string) => {
    const m: Record<string, string> = { entrance: '🚪', exit: '🚶', stage: '🎤', bar: '🍸', dancefloor: '💃', buffet: '🍽️', restroom: '🚻', dj: '🎧' };
    return m[type] || '📍';
  };

  // LOADING
  if (phase === 'loading') return (
    <div className= "guest-root" style = {{ display: 'flex', alignItems: 'center', justifyContent: 'center' }
}>
  <style>{ styles } < /style><div className="aurora-bg" / > <StarField />
  < div style = {{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
    <div className="spinner" style = {{ margin: '0 auto 20px' }} />
      < p style = {{ color: 'rgba(140,170,255,.6)', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase' }}> Loading < /p>
        < /div>
        < /div>
  );

if (loadError || !event) return (
  <div className= "guest-root" style = {{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <style>{ styles } < /style><div className="aurora-bg" / > <StarField />
    < div style = {{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
      <div style={ { fontSize: 40, marginBottom: 16 } }>✦</div>
        < h1 style = {{ fontFamily: 'Cormorant Garamond,serif', fontSize: 28, color: '#e8f0fe', marginBottom: 8 }}> { loadError || 'Error'}</h1>
          < p style = {{ color: 'rgba(140,170,255,.5)', fontSize: 13 }}> Check your QR code < /p>
            < /div>
            < /div>
  );

// REVEAL — nueva pantalla de presentación
if (phase === 'reveal' && foundGuest) return (
  <div className= "guest-root fade-in" style = {{ minHeight: '100vh', position: 'relative' }}>
    <style>{ styles } < /style>
    < div className = "aurora-bg" />
      <StarField />
      < RevealScreen
guest = { foundGuest }
table = { foundTable }
eventName = { event.name }
onContinue = { handleRevealContinue }
  />
  </div>
  );

// MEDIA
if (phase === 'media' && foundTable?.videoUrl) {
  const url = foundTable.videoUrl;
  const embedUrl = getEmbedUrl(url);
  const isImg = isImage(url);
  return (
    <div className= "guest-root fade-in" style = {{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }
}>
  <style>{ styles } < /style><div className="aurora-bg" / > <StarField />
  < div style = {{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '24px 20px' }}>
    <div className="fade-in-up" style = {{ textAlign: 'center', marginBottom: 20 }}>
      <p style={ { fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(140,170,255,.5)', marginBottom: 8 } }> { event.name } < /p>
        < h1 className = "guest-name" > { foundGuest?.name } { foundGuest?.surname } </h1>
          < div style = {{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
            <span className="table-badge" >✦ Mesa { foundTable.label } ✦</span>
              < /div>
              < /div>
              < div className = "gold-line" style = {{ marginBottom: 20 }} />
                < div className = "media-container fade-in-up" style = {{ animationDelay: '.15s', flex: 1 }}>
                {
                  embedUrl?(
              <div style = {{ position: 'relative', paddingBottom: '177.78%', height: 0 }} >
                  <iframe src={ embedUrl } style = {{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow = "autoplay; fullscreen; picture-in-picture" allowFullScreen />
                    </div>
            ) : isImg ? (
  <img src= { url } alt = "Tu invitación" />
            ) : (
  <video ref= { videoRef } src = { url } autoPlay playsInline controls onEnded = {() => setPhase('map')} />
            )}
</div>
  < div style = {{ display: 'flex', gap: 10, marginTop: 20 }}>
    <button className="btn-gold" onClick = {() => setPhase('map')} style = {{ flex: 1 }}> View my table < /button>
      < button className = "btn-ghost" onClick = {() => setPhase('search')} style = {{ flex: 1 }}> Search again < /button>
        < /div>
        < /div>
        < /div>
    );
  }

// MAP
if (phase === 'map') {
  return (
    <div className= "guest-root fade-in" style = {{ minHeight: '100vh' }
}>
  <style>{ styles } < /style>
{ !mapFullscreen && <><div className="aurora-bg" /> <StarField /></ >}
<div style={ { position: 'relative', zIndex: 1, padding: mapFullscreen ? 0 : '20px 16px', display: 'flex', flexDirection: 'column', minHeight: '100vh' } }>

  {!mapFullscreen && (
    <div className="glass-card fade-in-up" style = {{ padding: '20px 24px', marginBottom: 14, textAlign: 'center' }}>
      <h2 className="guest-name" style = {{ fontSize: 'clamp(1.6rem,6vw,2.4rem)' }}>
        { foundGuest?.name } { foundGuest?.surname }
</h2>
  < div style = {{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
    <span className="table-badge" >✦ Mesa { foundTable?.label || 'Sin asignar' } ✦</span>
      < /div>
      < /div>
          )}

<CanvasMap
            tables={ tables }
markers = { markers }
myTableId = { foundGuest?.tableId }
fullscreen = { mapFullscreen }
onToggleFullscreen = {() => setMapFullscreen(f => !f)}
onCenterMyTable = {() => { }}
getMarkerIcon = { getMarkerIcon }
  />

  {!mapFullscreen && (
    <div style={ { display: 'flex', gap: 10, marginTop: 14 } }>
      { foundTable?.videoUrl && (
        <button className="btn-gold" onClick = {() => setPhase('media')} style = {{ flex: 1 }}> Watch video < /button>
              )}
<button className="btn-ghost" onClick = {() => setPhase('search')} style = {{ flex: 1 }}> Search again < /button>
  < /div>
          )}
</div>
  < /div>
    );
  }

// SEARCH
return (
  <div className= "guest-root fade-in" style = {{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
    <style>{ styles } < /style><div className="aurora-bg" / > <StarField />
    < div style = {{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
      <div className="fade-in-up" style = {{ textAlign: 'center', marginBottom: 32 }}>
        <div style={ { fontSize: 11, letterSpacing: '.25em', textTransform: 'uppercase', color: 'rgba(180,150,55,.7)', marginBottom: 14 } }>✦ Welcome ✦</div>
          < h1 style = {{ fontFamily: 'Cormorant Garamond,serif', fontWeight: 300, fontSize: 'clamp(2rem,9vw,3rem)', color: '#e8f0fe', lineHeight: 1.2, marginBottom: 8 }}>
            { event.name || 'Tu Evento' }
            < /h1>
{
  event.hostName && <p style={ { color: 'rgba(180,150,55,.8)', fontSize: 13, letterSpacing: '.06em', marginBottom: 4 } }> { event.hostName } < /p>}
  {
    event.eventDate && <p style={ { color: 'rgba(140,170,255,.4)', fontSize: 12, letterSpacing: '.08em' } }> { event.eventDate } < /p>}
    {
      event.venue && <p style={ { color: 'rgba(140,170,255,.35)', fontSize: 11, letterSpacing: '.06em', marginTop: 2 } }> { event.venue } < /p>}
        < /div>
        < div className = "gold-line" style = {{ marginBottom: 28 }
    } />
      < div className = "glass-card fade-in-up" style = {{ padding: '28px 24px', animationDelay: '.15s' }
  }>
    <div className="ornament" style = {{ marginBottom: 24 }
}> FIND YOUR SEAT < /div>
  < div style = {{ marginBottom: 14 }}>
    <label className="field-label" > Name < /label>
      < input className = "search-input" value = { searchName } onChange = { e => setSearchName(e.target.value) } placeholder = "Your name" onKeyDown = { e => e.key === 'Enter' && handleSearch() } />
        </div>
        < div style = {{ marginBottom: 24 }}>
          <label className="field-label" > Last name < /label>
            < input className = "search-input" value = { searchSurname } onChange = { e => setSearchSurname(e.target.value) } placeholder = "Your last name" onKeyDown = { e => e.key === 'Enter' && handleSearch() } />
              </div>
              < button className = "btn-primary" onClick = { handleSearch } disabled = { searching } >
                { searching? 'Searching...': 'Find my table' }
                < /button>
                < /div>
                < p style = {{ textAlign: 'center', marginTop: 20, color: 'rgba(100,130,200,.3)', fontSize: 10, letterSpacing: '.15em' }}>✦</p>
                  < /div>
                  < /div>
  );
}