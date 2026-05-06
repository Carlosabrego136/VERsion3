import { useState, useEffect, useRef } from 'react';
import { EventData, TableData, GuestData, LocationMarker } from '../types';
import { getEvent, getTables, getLocationMarkers, findGuestByName } from '../store';

interface GuestPageProps {
  eventId: string;
}

export default function GuestPage({ eventId }: GuestPageProps) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchSurname, setSearchSurname] = useState('');
  const [foundGuest, setFoundGuest] = useState<GuestData | null>(null);
  const [foundTable, setFoundTable] = useState<TableData | null>(null);
  const [phase, setPhase] = useState<'search' | 'video' | 'map'>('search');
  const [searching, setSearching] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Map controls
  const [mapZoom, setMapZoom] = useState(0.5);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showInstructions, setShowInstructions] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [ev, t, m] = await Promise.all([getEvent(eventId), getTables(eventId), getLocationMarkers(eventId)]);
      if (ev) setEvent(ev);
      setTables(t);
      setMarkers(m);
    };
    load();
  }, [eventId]);

  // Center map on user's table when entering map phase
  useEffect(() => {
    if (phase === 'map' && foundTable) {
      const centerX = -(foundTable.position.x - 150);
      const centerY = -(foundTable.position.y - 200);
      setMapOffset({ x: centerX, y: centerY });
    }
  }, [phase, foundTable]);

  const handleSearch = async () => {
    setSearching(true);
    const guest = await findGuestByName(eventId, searchName, searchSurname);
    setSearching(false);
    if (guest) {
      setFoundGuest(guest);
      const table = tables.find(t => t.id === guest.tableId);
      setFoundTable(table || null);
      if (table?.videoUrl) {
        setPhase('video');
      } else {
        setPhase('map');
      }
    } else {
      alert('No se encontro un invitado con ese nombre. Verifica tu nombre y apellido.');
    }
  };

  const getMarkerIcon = (type: string) => {
    const icons: Record<string, string> = {
      entrance: '\u{1F6AA}', exit: '\u{1F6B6}', stage: '\u{1F3A4}', bar: '\u{1F378}',
      dancefloor: '\u{1F483}', buffet: '\u{1F37D}', restroom: '\u{1F6BB}', dj: '\u{1F3A7}',
    };
    return icons[type] || '\u{1F4CD}';
  };

  // Touch/Mouse handlers for panning
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapOffset.x, y: e.clientY - mapOffset.y });
    setShowInstructions(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setMapOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const zoomIn = () => setMapZoom(z => Math.min(z + 0.15, 2));
  const zoomOut = () => setMapZoom(z => Math.max(z - 0.15, 0.2));

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setMapFullscreen(!mapFullscreen);
  };

  if (!event) {
    return (
      <div className= "min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center" >
      <div className="text-center" >
        <h1 className="text-2xl font-bold text-gray-800" > Evento no encontrado < /h1>
          < p className = "text-gray-500 mt-2" > Verifica el codigo QR < /p>
            < /div>
            < /div>
    );
  }

  // Video phase
  if (phase === 'video' && foundTable?.videoUrl) {
    return (
      <div className= "min-h-screen bg-black flex flex-col items-center justify-center p-4" >
      <div className="w-full max-w-lg" >
        <div className="text-center mb-4" >
          <p className="text-amber-300 font-semibold text-lg" >
            { foundGuest?.name } { foundGuest?.surname }
    </p>
      < p className = "text-white/60 text-sm" > Mesa { foundTable.label } </p>
        < /div>

        < video
    ref = { videoRef }
    src = { foundTable.videoUrl }
    autoPlay
    controls
    onEnded = {() => setPhase('map')
  }
  className = "w-full rounded-xl"
    />

    <div className="flex justify-between mt-4" >
      <button
              onClick={ () => setPhase('map') }
  className = "px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors"
    >
    Ver mi mesa
      < /button>
      < button
  onClick = {() => setPhase('search')
}
className = "px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white/60 rounded-xl text-sm transition-colors"
  >
  Buscar otro
    < /button>
    < /div>
    < /div>
    < /div>
    );
  }

// Map phase
if (phase === 'map') {
  const mapContent = (
    <div
        className= {`${mapFullscreen ? 'fixed inset-0 z-[9999] bg-gradient-to-br from-stone-100 to-amber-50' : 'min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30'}`
}
      >
  <div className={ `${mapFullscreen ? 'h-full flex flex-col' : 'max-w-4xl mx-auto px-4 py-6 space-y-4'}` }>
    {/* Header */ }
    < div className = {`bg-white ${mapFullscreen ? 'rounded-none border-b' : 'rounded-xl shadow-sm border border-gray-200'} p-4 text-center ${mapFullscreen ? 'flex-shrink-0' : ''}`}>
      <h2 className="text-xl font-bold text-gray-900" >
        { foundGuest?.name } { foundGuest?.surname }
</h2>
  < p className = "text-amber-600 font-semibold mt-1" >
    Tu mesa: { foundTable?.label || 'Sin asignar' }
</p>
  < /div>

{/* Instructions popup */ }
{
  showInstructions && (
    <div className={ `${mapFullscreen ? 'absolute top-20 left-4 right-4 z-50' : ''} bg-amber-50 border border-amber-200 rounded-xl p-4 mx-4 mt-2` }>
      <div className="flex items-start gap-3" >
        <span className="text-2xl" >👆</span>
          < div className = "flex-1" >
            <p className="font-semibold text-amber-800 text-sm" > Como usar el mapa < /p>
              < ul className = "text-amber-700 text-xs mt-1 space-y-1" >
                <li>• Arrastra con el dedo para moverte < /li>
                  <li>• Usa los botones + y - para acercar o alejar < /li>
                    <li>• Toca "Expandir" para ver en pantalla completa < /li>
                      <li>• Tu mesa esta resaltada en dorado < /li>
                        < /ul>
                        < /div>
                        < button
  onClick = {() => setShowInstructions(false)
}
className = "text-amber-600 hover:text-amber-800 text-xl font-bold"
  >
                  ×
</button>
  < /div>
  < /div>
          )}

{/* Map container */ }
<div
            ref={ mapContainerRef }
className = {`relative ${mapFullscreen ? 'flex-1' : 'w-full rounded-xl shadow-lg border border-gray-200'} overflow-hidden touch-none`}
style = {{
  minHeight: mapFullscreen ? undefined : '400px',
    height: mapFullscreen ? undefined : '65vh',
      background: 'linear-gradient(135deg, #f8f6f0 0%, #f0ece4 100%)',
        cursor: isDragging ? 'grabbing' : 'grab',
            }}
onPointerDown = { handlePointerDown }
onPointerMove = { handlePointerMove }
onPointerUp = { handlePointerUp }
onPointerLeave = { handlePointerUp }
  >
  {/* Grid pattern */ }
  < div className = "absolute inset-0 opacity-10" style = {{
  backgroundImage: 'radial-gradient(circle, #999 1px, transparent 1px)',
    backgroundSize: '30px 30px',
            }} />

{/* Zoomable/Pannable content */ }
<div
              style={
  {
    transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom})`,
      transformOrigin: '0 0',
        width: '4000px',
          height: '3000px',
            position: 'relative',
              }
}
            >
{
  tables.map(t => {
    const isMyTable = t.id === foundGuest?.tableId;
    return (
      <div
                    key= { t.id }
    className = {`absolute flex items-center justify-center text-xs font-bold shadow-md transition-all ${t.shape === 'round' || t.shape === 'oval' ? 'rounded-full' : 'rounded-lg'
      } ${isMyTable ? 'animate-pulse-glow' : ''}`
  }
                    style = {{
    left: t.position.x,
    top: t.position.y,
    width: t.size.width,
    height: t.size.height,
    background: isMyTable
      ? 'linear-gradient(135deg, #d4af37, #f5deb3)'
      : 'linear-gradient(135deg, #f5f0e8, #e8dcc8)',
    border: isMyTable ? '3px solid #b8860b' : '2px solid #d4af37',
    color: isMyTable ? '#fff' : '#8b7355',
    boxShadow: isMyTable ? '0 0 20px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.3)' : undefined,
    zIndex: isMyTable ? 10 : 1,
  }}
  >
  <div className="text-center leading-tight" >
    <div className="text-sm font-bold" > { t.label } < /div>
{
  isMyTable && <div className="text-[10px]" > TU MESA < /div>}
    < /div>
    < /div>
                );
})}

{
  markers.map(m => (
    <div
                  key= { m.id }
                  className = "absolute flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm bg-white/90"
                  style = {{ left: m.position.x, top: m.position.y }}
                >
  <span>{ getMarkerIcon(m.markerType) } < /span>
  < span className = "text-gray-700" > { m.label } < /span>
    < /div>
              ))}
</div>

{/* Zoom controls - fixed position */ }
<div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20" >
  <button
                onClick={ zoomIn }
className = "w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-2xl font-bold text-gray-700 hover:bg-gray-50 active:scale-95"
  >
  +
  </button>
  < button
onClick = { zoomOut }
className = "w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-2xl font-bold text-gray-700 hover:bg-gray-50 active:scale-95"
  >
  -
  </button>
  < /div>

{/* Fullscreen toggle */ }
<button
              onClick={ toggleFullscreen }
className = "absolute top-4 right-4 px-4 py-2 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 z-20"
  >
{
  mapFullscreen?(
                <>
  <svg className="w-5 h-5" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24" >
    <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M6 18L18 6M6 6l12 12" />
      </svg>
Cerrar
  < />
              ) : (
  <>
  <svg className= "w-5 h-5" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24" >
    <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
Expandir
  < />
              )}
</button>

{/* Zoom indicator */ }
<div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/90 rounded-lg text-xs text-gray-600 shadow z-20" >
  Zoom: { Math.round(mapZoom * 100) }%
    </div>

{/* Center on my table button */ }
<button
              onClick={
  () => {
    if (foundTable) {
      const centerX = -(foundTable.position.x - 150);
      const centerY = -(foundTable.position.y - 200);
      setMapOffset({ x: centerX, y: centerY });
      setMapZoom(0.8);
    }
  }
}
className = "absolute top-4 left-4 px-4 py-2 bg-amber-500 text-white rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-amber-600 active:scale-95 z-20"
  >
  <svg className="w-5 h-5" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24" >
    <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
              Mi mesa
  < /button>
  < /div>

{/* Bottom buttons - only show when not fullscreen */ }
{
  !mapFullscreen && (
    <div className="flex gap-3 px-4" >
      { foundTable?.videoUrl && (
        <button
                  onClick={ () => setPhase('video') }
  className = "flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 transition-all"
    >
    Ver Video
      < /button>
              )
}
<button
                onClick={ () => setPhase('search') }
className = "flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
  >
  Buscar Otro
    < /button>
    < /div>
          )}
</div>
  < /div>
    );

return mapContent;
  }

// Search phase (default)
return (
  <div className= "min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center p-4" >
  <div className="max-w-md w-full space-y-6" >
    <div className="text-center" >
      <h1 className="text-3xl font-bold text-gray-900" style = {{ fontFamily: 'serif' }}>
        { event.name || 'Bienvenido' }
        < /h1>
{
  event.hostName && <p className="text-amber-600 font-medium mt-1" > { event.hostName } < /p>}
  {
    event.eventDate && <p className="text-gray-400 text-sm mt-1" > { event.eventDate } < /p>}
    {
      event.venue && <p className="text-gray-400 text-sm" > { event.venue } < /p>}
        < /div>

        < div className = "bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4" >
          <h2 className="text-lg font-semibold text-gray-800 text-center" > Busca tu nombre < /h2>

            < div >
            <label className="block text-sm font-medium text-gray-700 mb-1" > Nombre < /label>
              < input
      value = { searchName }
      onChange = { e => setSearchName(e.target.value) }
      placeholder = "Tu nombre"
      className = "w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      onKeyDown = { e => e.key === 'Enter' && handleSearch() }
        />
        </div>

        < div >
        <label className="block text-sm font-medium text-gray-700 mb-1" > Apellido < /label>
          < input
      value = { searchSurname }
      onChange = { e => setSearchSurname(e.target.value) }
      placeholder = "Tu apellido"
      className = "w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      onKeyDown = { e => e.key === 'Enter' && handleSearch() }
        />
        </div>

        < button
      onClick = { handleSearch }
      disabled = { searching }
      className = "w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
        >
        { searching? 'Buscando...': 'Buscar' }
        < /button>
        < /div>
        < /div>
        < /div>
  );
    }
