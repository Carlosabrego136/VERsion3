import { useState, useEffect, useRef } from 'react';
import { EventData, TableData, GuestData, LocationMarker } from '../types';
import { getEvent, getTables, getLocationMarkers, getGuests } from '../store';

interface GuestPageProps {
  eventId: string;
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap');

  .guest-root {
    font-family: 'Montserrat', sans-serif;
    background: #050a15;
    min-height: 100vh;
    color: #e8f0fe;
  }

  .aurora-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .aurora-bg::before {
    content: '';
    position: absolute;
    width: 120%; height: 120%;
    top: -10%; left: -10%;
    background: radial-gradient(ellipse 80% 60% at 20% 20%, rgba(14,60,120,0.55) 0%, transparent 60%),
                radial-gradient(ellipse 60% 80% at 80% 80%, rgba(6,30,80,0.5) 0%, transparent 60%),
                radial-gradient(ellipse 50% 50% at 50% 50%, rgba(180,150,60,0.06) 0%, transparent 70%);
    animation: auroraShift 18s ease-in-out infinite alternate;
  }
  .aurora-bg::after {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 40% 30% at 70% 30%, rgba(30,100,200,0.18) 0%, transparent 60%),
                radial-gradient(ellipse 30% 40% at 30% 70%, rgba(10,50,140,0.15) 0%, transparent 60%);
    animation: auroraShift2 22s ease-in-out infinite alternate;
  }
  @keyframes auroraShift {
    0% { transform: scale(1) rotate(0deg); opacity: 0.8; }
    100% { transform: scale(1.05) rotate(2deg); opacity: 1; }
  }
  @keyframes auroraShift2 {
    0% { transform: scale(1.05) rotate(-1deg); opacity: 0.6; }
    100% { transform: scale(1) rotate(1deg); opacity: 1; }
  }

  .stars { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
  .star {
    position: absolute; background: white; border-radius: 50%;
    animation: twinkle var(--dur) ease-in-out infinite alternate;
    opacity: 0;
  }
  @keyframes twinkle {
    0% { opacity: 0; transform: scale(0.8); }
    100% { opacity: var(--op); transform: scale(1.2); }
  }

  .gold-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(212,175,55,0.6), rgba(212,175,55,0.9), rgba(212,175,55,0.6), transparent);
  }

  .glass-card {
    background: rgba(10,25,60,0.65);
    border: 1px solid rgba(100,150,255,0.15);
    backdrop-filter: blur(20px);
    box-shadow: 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(100,150,255,0.1);
    border-radius: 20px;
  }

  .search-input {
    background: rgba(6,20,55,0.8);
    border: 1px solid rgba(80,130,255,0.2);
    color: #e8f0fe;
    border-radius: 12px;
    padding: 14px 18px;
    width: 100%;
    font-family: 'Montserrat', sans-serif;
    font-size: 14px; font-weight: 300;
    outline: none;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }
  .search-input::placeholder { color: rgba(140,170,255,0.4); }
  .search-input:focus {
    border-color: rgba(180,150,55,0.5);
    box-shadow: 0 0 0 3px rgba(180,150,55,0.08), 0 0 20px rgba(80,130,255,0.1);
  }

  .btn-primary {
    background: linear-gradient(135deg, #1a4a9e 0%, #0d2d6e 50%, #1a3a8a 100%);
    border: 1px solid rgba(180,150,55,0.4);
    color: #f0d060;
    font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 13px;
    letter-spacing: 0.08em; text-transform: uppercase;
    padding: 14px 28px; border-radius: 12px; cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(10,30,100,0.4); width: 100%;
  }
  .btn-primary:hover { background: linear-gradient(135deg, #1e58c0 0%, #102f7a 50%, #1e4aaa 100%); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-ghost {
    background: rgba(10,25,70,0.5);
    border: 1px solid rgba(80,130,255,0.2);
    color: rgba(180,210,255,0.7);
    font-family: 'Montserrat', sans-serif; font-weight: 400; font-size: 12px;
    letter-spacing: 0.06em; padding: 12px 20px; border-radius: 10px; cursor: pointer;
    transition: all 0.3s ease;
  }
  .btn-ghost:hover { background: rgba(20,50,120,0.5); border-color: rgba(180,150,55,0.3); color: rgba(240,210,100,0.8); }

  .btn-gold {
    background: linear-gradient(135deg, rgba(180,150,55,0.2) 0%, rgba(212,175,55,0.15) 100%);
    border: 1px solid rgba(212,175,55,0.4);
    color: #d4af37;
    font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 12px;
    letter-spacing: 0.08em; text-transform: uppercase;
    padding: 12px 20px; border-radius: 10px; cursor: pointer;
    transition: all 0.3s ease;
  }
  .btn-gold:hover { background: linear-gradient(135deg, rgba(180,150,55,0.3) 0%, rgba(212,175,55,0.25) 100%); box-shadow: 0 4px 16px rgba(180,150,55,0.2); }

  .guest-name {
    font-family: 'Cormorant Garamond', serif; font-weight: 300; font-style: italic;
    font-size: clamp(2rem, 8vw, 3.2rem);
    background: linear-gradient(135deg, #a8c4ff 0%, #e8f0fe 40%, #d4af37 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    line-height: 1.2; letter-spacing: 0.02em;
  }

  .table-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(180,150,55,0.12);
    border: 1px solid rgba(180,150,55,0.3);
    color: #d4af37; font-size: 12px; font-weight: 500;
    letter-spacing: 0.12em; text-transform: uppercase;
    padding: 6px 16px; border-radius: 100px;
  }

  .media-container {
    position: relative; width: 100%; border-radius: 16px; overflow: hidden; background: #000;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,150,255,0.1);
  }
  .media-container video { width: 100%; display: block; max-height: 72vh; object-fit: contain; }
  .media-container img { width: 100%; display: block; max-height: 72vh; object-fit: contain; }

  .spinner {
    width: 44px; height: 44px;
    border: 2px solid rgba(80,130,255,0.15);
    border-top-color: #d4af37; border-right-color: rgba(80,130,255,0.6);
    border-radius: 50%; animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fade-in { animation: fadeIn 0.6s ease forwards; }
  .fade-in-up { animation: fadeInUp 0.7s ease forwards; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  .map-wrap {
    position: relative; width: 100%; border-radius: 16px; overflow: hidden;
    border: 1px solid rgba(80,130,255,0.15);
    background: linear-gradient(135deg, #07152e 0%, #050f25 100%);
    box-shadow: 0 8px 40px rgba(0,0,0,0.5); touch-action: none;
  }
  .map-fullscreen { position: fixed !important; inset: 0 !important; border-radius: 0 !important; z-index: 9999 !important; }

  .my-table-glow { animation: tableGlow 2.5s ease-in-out infinite alternate; }
  @keyframes tableGlow {
    0% { box-shadow: 0 0 12px rgba(212,175,55,0.5), 0 0 24px rgba(212,175,55,0.2); }
    100% { box-shadow: 0 0 20px rgba(212,175,55,0.8), 0 0 40px rgba(212,175,55,0.35); }
  }

  .ornament {
    display: flex; align-items: center; gap: 12px;
    color: rgba(180,150,55,0.5); font-size: 10px; letter-spacing: 0.2em;
  }
  .ornament::before, .ornament::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(180,150,55,0.3)); }
  .ornament::after { background: linear-gradient(90deg, rgba(180,150,55,0.3), transparent); }

  label.field-label {
    display: block; font-size: 10px; font-weight: 500; letter-spacing: 0.14em;
    text-transform: uppercase; color: rgba(140,170,255,0.6); margin-bottom: 8px;
  }

  /* Hide native video controls on mobile when not interacting */
  video::-webkit-media-controls { opacity: 0.5; }
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

export default function GuestPage({ eventId }: GuestPageProps) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchSurname, setSearchSurname] = useState('');
  const [foundGuest, setFoundGuest] = useState<GuestData | null>(null);
  const [foundTable, setFoundTable] = useState<TableData | null>(null);
  const [phase, setPhase] = useState<'loading' | 'search' | 'media' | 'map'>('loading');
  const [searching, setSearching] = useState(false);
  const [loadError, setLoadError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const [mapZoom, setMapZoom] = useState(0.5);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoadError('');
      try {
        const [ev, t, g, m] = await Promise.all([
          getEvent(eventId), getTables(eventId), getGuests(eventId), getLocationMarkers(eventId)
        ]);
        if (!ev) { setLoadError('Evento no encontrado'); return; }
        setEvent(ev); setTables(t); setGuests(g); setMarkers(m);
        setPhase('search');
      } catch { setLoadError('Error cargando el evento'); }
    };
    load();
  }, [eventId]);

  useEffect(() => {
    if (phase === 'map' && foundTable) {
      setMapOffset({ x: -(foundTable.position.x - 150), y: -(foundTable.position.y - 200) });
    }
  }, [phase, foundTable]);

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    try {
      const nameSearch = searchName.trim().toLowerCase();
      const surnameSearch = searchSurname.trim().toLowerCase();
      const found = guests.find(g =>
        g.name.toLowerCase() === nameSearch &&
        (surnameSearch === '' || g.surname.toLowerCase() === surnameSearch)
      );
      if (found) {
        setFoundGuest(found);
        const table = tables.find(t => t.id === found.tableId);
        setFoundTable(table || null);
        setPhase(table?.videoUrl ? 'media' : 'map');
      } else {
        alert('No se encontró ese nombre. Verifica nombre y apellido.');
      }
    } catch { alert('Error al buscar. Intenta de nuevo.'); }
    setSearching(false);
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url);
  const isVideo = (url: string) => /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url);

  const getEmbedUrl = (url: string) => {
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=d4af37&title=0&byline=0&portrait=0`;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    return null;
  };

  const getMarkerIcon = (type: string) => {
    const icons: Record<string, string> = {
      entrance: '🚪', exit: '🚶', stage: '🎤', bar: '🍸',
      dancefloor: '💃', buffet: '🍽️', restroom: '🚻', dj: '🎧',
    };
    return icons[type] || '📍';
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapOffset.x, y: e.clientY - mapOffset.y });
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setMapOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handlePointerUp = () => setIsDragging(false);
  const zoomIn = () => setMapZoom(z => Math.min(z + 0.15, 2));
  const zoomOut = () => setMapZoom(z => Math.max(z - 0.15, 0.2));

  // LOADING
  if (phase === 'loading') return (
    <div className= "guest-root" style = {{ display: 'flex', alignItems: 'center', justifyContent: 'center' }
}>
  <style>{ styles } < /style>
  < div className = "aurora-bg" /> <StarField />
    < div style = {{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
      <div className="spinner" style = {{ margin: '0 auto 20px' }} />
        < p style = {{ color: 'rgba(140,170,255,0.6)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}> Cargando < /p>
          < /div>
          < /div>
  );

if (loadError) return (
  <div className= "guest-root" style = {{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <style>{ styles } < /style>
    < div className = "aurora-bg" /> <StarField />
      < div style = {{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
        <div style={ { fontSize: 40, marginBottom: 16 } }>✦</div>
          < h1 style = {{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, color: '#e8f0fe', marginBottom: 8 }}> { loadError } < /h1>
            < p style = {{ color: 'rgba(140,170,255,0.5)', fontSize: 13 }}> Verifica el código QR < /p>
              < /div>
              < /div>
  );

if (!event) return null;

// MEDIA
if (phase === 'media' && foundTable?.videoUrl) {
  const url = foundTable.videoUrl;
  const embedUrl = getEmbedUrl(url);
  const isImg = isImage(url);

  return (
    <div className= "guest-root fade-in" style = {{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }
}>
  <style>{ styles } < /style>
  < div className = "aurora-bg" /> <StarField />
    < div style = {{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '24px 20px' }}>

      <div className="fade-in-up" style = {{ textAlign: 'center', marginBottom: 20 }}>
        <p style={ { fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(140,170,255,0.5)', marginBottom: 8 } }> { event.name } < /p>
          < h1 className = "guest-name" > { foundGuest?.name } { foundGuest?.surname } </h1>
            < div style = {{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
              <span className="table-badge" >✦ Mesa { foundTable.label } ✦</span>
                < /div>
                < /div>

                < div className = "gold-line" style = {{ marginBottom: 20 }} />

                  < div className = "media-container fade-in-up" style = {{ animationDelay: '0.15s', flex: 1 }}>
                  {
                    embedUrl?(
              <div style = {{ position: 'relative', paddingBottom: '177.78%', height: 0 }} >
                    <iframe
                  src={ embedUrl }
style = {{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
allow = "autoplay; fullscreen; picture-in-picture"
allowFullScreen
  />
  </div>
            ) : isImg ? (
  <img src= { url } alt = "Tu invitación" />
            ) : (
  <video
                ref= { videoRef }
src = { url }
autoPlay
playsInline
controls
onEnded = {() => setPhase('map')}
/>
            )}
</div>

  < div style = {{ display: 'flex', gap: 10, marginTop: 20 }}>
    <button className="btn-gold" onClick = {() => setPhase('map')} style = {{ flex: 1 }}> Ver mi mesa < /button>
      < button className = "btn-ghost" onClick = {() => setPhase('search')} style = {{ flex: 1 }}> Buscar otro < /button>
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

<div
            ref={ mapContainerRef }
className = {`map-wrap${mapFullscreen ? ' map-fullscreen' : ''}`}
style = {{ height: mapFullscreen ? '100vh' : '58vh', cursor: isDragging ? 'grabbing' : 'grab' }}
onPointerDown = { handlePointerDown }
onPointerMove = { handlePointerMove }
onPointerUp = { handlePointerUp }
onPointerLeave = { handlePointerUp }
  >
  <div style={
    {
      position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: 'radial-gradient(circle, rgba(100,150,255,0.8) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
            }
} />

  < div style = {{
  transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom})`,
    transformOrigin: '0 0', width: '4000px', height: '3000px', position: 'relative',
            }}>
{
  tables.map(t => {
    const isMine = t.id === foundGuest?.tableId;
    return (
      <div key= { t.id } className = { isMine? 'my-table-glow': '' } style = {{
      position: 'absolute', left: t.position.x, top: t.position.y,
        width: t.size.width, height: t.size.height,
          borderRadius: t.shape === 'round' || t.shape === 'oval' ? '50%' : '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600,
                background: isMine
                  ? 'linear-gradient(135deg, rgba(212,175,55,0.3) 0%, rgba(180,140,40,0.2) 100%)'
                  : 'rgba(10,30,80,0.7)',
                  border: isMine ? '2px solid rgba(212,175,55,0.8)' : '1px solid rgba(80,130,255,0.25)',
                    color: isMine ? '#d4af37' : 'rgba(140,170,255,0.7)',
                      zIndex: isMine ? 10 : 1, textAlign: 'center',
                  }
  }>
  <div>
  <div style={{ fontSize: 10, fontWeight: 700 }} > { t.label } < /div>
{
  isMine && <div style={ { fontSize: 8, letterSpacing: '0.1em', marginTop: 2 } }> TU MESA < /div>}
    < /div>
    < /div>
                );
})}

{
  markers.map(m => (
    <div key= { m.id } style = {{
    position: 'absolute', left: m.position.x, top: m.position.y,
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px',
    background: 'rgba(8,20,55,0.85)',
    border: '1px solid rgba(80,130,255,0.2)',
    borderRadius: 100, fontSize: 11, color: 'rgba(180,210,255,0.8)',
    backdropFilter: 'blur(8px)',
  }}>
    <span>{ getMarkerIcon(m.markerType) } < /span>
    < span > { m.label } < /span>
    < /div>
              ))}
</div>

{/* Controls */ }
<div style={ { position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20 } }>
{
  [{ label: '+', fn: zoomIn }, { label: '−', fn: zoomOut }].map(btn => (
    <button key= { btn.label } onClick = { btn.fn } style = {{
    width: 44, height: 44, background: 'rgba(8,20,55,0.9)',
    border: '1px solid rgba(80,130,255,0.25)', color: '#a0c0ff',
    fontSize: 20, fontWeight: 300, borderRadius: 12, cursor: 'pointer',
    backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }} > { btn.label } < /button>
              ))}
</div>

  < button onClick = {() => setMapFullscreen(!mapFullscreen)} style = {{
  position: 'absolute', top: 12, right: 12, zIndex: 20,
    background: 'rgba(8,20,55,0.9)', border: '1px solid rgba(80,130,255,0.25)',
      color: '#a0c0ff', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
        textTransform: 'uppercase', padding: '8px 14px', borderRadius: 10,
          cursor: 'pointer', backdropFilter: 'blur(10px)',
            }}>
  { mapFullscreen? '✕ Cerrar': '⛶ Expandir' }
  < /button>

  < button onClick = {() => {
  if (foundTable) {
    setMapOffset({ x: -(foundTable.position.x - 150), y: -(foundTable.position.y - 200) });
    setMapZoom(0.8);
  }
}} style = {{
  position: 'absolute', top: 12, left: 12, zIndex: 20,
    background: 'linear-gradient(135deg, rgba(180,150,55,0.2), rgba(150,120,40,0.15))',
      border: '1px solid rgba(212,175,55,0.4)', color: '#d4af37',
        fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '8px 14px', borderRadius: 10, cursor: 'pointer', backdropFilter: 'blur(10px)',
            }}>
              ✦ Mi mesa
  < /button>

  < div style = {{
  position: 'absolute', bottom: 16, left: 16, zIndex: 20,
    background: 'rgba(8,20,55,0.7)', border: '1px solid rgba(80,130,255,0.15)',
      color: 'rgba(140,170,255,0.5)', fontSize: 10, letterSpacing: '0.1em',
        padding: '5px 10px', borderRadius: 8, backdropFilter: 'blur(8px)',
            }}> { Math.round(mapZoom * 100) } % </div>
  < /div>

{
  !mapFullscreen && (
    <div style={ { display: 'flex', gap: 10, marginTop: 14 } }>
      { foundTable?.videoUrl && (
        <button className="btn-gold" onClick = {() => setPhase('media')
} style = {{ flex: 1 }}> Ver video < /button>
              )}
<button className="btn-ghost" onClick = {() => setPhase('search')} style = {{ flex: 1 }}> Buscar otro < /button>
  < /div>
          )}
</div>
  < /div>
    );
  }

// SEARCH
return (
  <div className= "guest-root fade-in" style = {{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
    <style>{ styles } < /style>
    < div className = "aurora-bg" /> <StarField />

      < div style = {{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>

        <div className="fade-in-up" style = {{ textAlign: 'center', marginBottom: 32 }}>
          <div style={ { fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(180,150,55,0.7)', marginBottom: 14 } }>
            ✦ Bienvenido ✦
</div>
  < h1 style = {{
  fontFamily: 'Cormorant Garamond, serif', fontWeight: 300,
    fontSize: 'clamp(2rem, 9vw, 3rem)', color: '#e8f0fe', lineHeight: 1.2, marginBottom: 8,
          }}>
  { event.name || 'Tu Evento' }
  < /h1>
{
  event.hostName && (
    <p style={ { color: 'rgba(180,150,55,0.8)', fontSize: 13, letterSpacing: '0.06em', marginBottom: 4 } }> { event.hostName } < /p>
          )
}
{
  event.eventDate && (
    <p style={ { color: 'rgba(140,170,255,0.4)', fontSize: 12, letterSpacing: '0.08em' } }> { event.eventDate } < /p>
          )
}
{
  event.venue && (
    <p style={ { color: 'rgba(140,170,255,0.35)', fontSize: 11, letterSpacing: '0.06em', marginTop: 2 } }> { event.venue } < /p>
          )
}
</div>

  < div className = "gold-line" style = {{ marginBottom: 28 }} />

    < div className = "glass-card fade-in-up" style = {{ padding: '28px 24px', animationDelay: '0.15s' }}>
      <div className="ornament" style = {{ marginBottom: 24 }}> BUSCA TU LUGAR < /div>

        < div style = {{ marginBottom: 14 }}>
          <label className="field-label" > Nombre < /label>
            < input
className = "search-input" value = { searchName }
onChange = { e => setSearchName(e.target.value) }
placeholder = "Tu nombre"
onKeyDown = { e => e.key === 'Enter' && handleSearch() }
  />
  </div>

  < div style = {{ marginBottom: 24 }}>
    <label className="field-label" > Apellido < /label>
      < input
className = "search-input" value = { searchSurname }
onChange = { e => setSearchSurname(e.target.value) }
placeholder = "Tu apellido"
onKeyDown = { e => e.key === 'Enter' && handleSearch() }
  />
  </div>

  < button className = "btn-primary" onClick = { handleSearch } disabled = { searching } >
    { searching? 'Buscando...': 'Encontrar mi mesa' }
    < /button>
    < /div>

    < p style = {{ textAlign: 'center', marginTop: 20, color: 'rgba(100,130,200,0.3)', fontSize: 10, letterSpacing: '0.15em' }}>
          ✦
</p>
  < /div>
  < /div>
  );
}