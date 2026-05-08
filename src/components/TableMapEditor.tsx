import { useState, useRef, useEffect } from 'react';
import { TableData, GuestData } from '../types';
import { generateId, saveTable, deleteTable, getTables, getGuests, getEvent, saveEvent } from '../store';
import { EventData } from '../types';

interface TableMapEditorProps {
  eventId: string;
}

export default function TableMapEditor({ eventId }: TableMapEditorProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [event, setEvent] = useState<EventData | null>(null);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [placingMode, setPlacingMode] = useState(false);
  const [floorPlanUrl, setFloorPlanUrl] = useState('');
  const [floorPlanInput, setFloorPlanInput] = useState('');
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [t, g, ev] = await Promise.all([getTables(eventId), getGuests(eventId), getEvent(eventId)]);
    setTables(t);
    setGuests(g);
    setEvent(ev);
    if (ev?.floorPlanUrl) {
      setFloorPlanUrl(ev.floorPlanUrl);
      if (!ev.floorPlanUrl.startsWith('data:')) setFloorPlanInput(ev.floorPlanUrl);
    }
  };

  useEffect(() => { refresh(); }, [eventId]);

  // ─── Guests por mesa ─────────────────────────────────────────────────────
  const guestsForTable = (tableId: string): GuestData[] =>
    guests.filter(g => g.tableId === tableId);

  // ─── Subir plano ─────────────────────────────────────────────────────────
  const handleFloorPlanFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingPlan(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      setFloorPlanUrl(url);
      if (event) await saveEvent({ ...event, floorPlanUrl: url });
      setUploadingPlan(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFloorPlanUrl = async () => {
    if (!event || !floorPlanInput.trim()) return;
    setFloorPlanUrl(floorPlanInput.trim());
    await saveEvent({ ...event, floorPlanUrl: floorPlanInput.trim() });
  };

  // ─── Colocar pin ─────────────────────────────────────────────────────────
  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode || !newTableLabel.trim()) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const t: TableData = {
      id: generateId(),
      eventId,
      label: newTableLabel.trim(),
      shape: 'round',
      position: { x: xPct, y: yPct },
      size: { width: 80, height: 80 },
      videoUrl: '',
      videoType: '',
    };
    await saveTable(t);
    setNewTableLabel('');
    setPlacingMode(false);
    refresh();
  };

  // ─── Drag pin ────────────────────────────────────────────────────────────
  const handlePinPointerDown = (e: React.PointerEvent, tableId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingTable(tableId);
    setDidDrag(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    if (!draggingTable) return;
    setDidDrag(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(1, Math.min(99, ((e.clientY - rect.top) / rect.height) * 100));
    setTables(prev => prev.map(t => t.id === draggingTable ? { ...t, position: { x: xPct, y: yPct } } : t));
  };

  const handleContainerPointerUp = async (e: React.PointerEvent) => {
    if (!draggingTable) return;
    const t = tables.find(t => t.id === draggingTable);
    if (t) await saveTable(t);
    // Solo abrir popup si no hubo drag real
    if (!didDrag) {
      setSelectedTable(prev => prev === draggingTable ? null : draggingTable);
    }
    setDraggingTable(null);
    setDidDrag(false);
  };

  const removeTable = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await deleteTable(id);
    if (selectedTable === id) setSelectedTable(null);
    refresh();
  };

  const selTable = tables.find(t => t.id === selectedTable);
  const hasFloorPlan = !!floorPlanUrl;

  return (
    <div className= "space-y-4" >
    {/* Panel plano */ }
    < div className = "bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" >🗺️ Plano del Salón < /h3>
        < p className = "text-xs text-gray-500" > Sube una foto del salón con las mesas ya dibujadas, luego coloca un pin sobre cada mesa.< /p>
          < div className = "flex flex-wrap gap-2 items-center" >
            <button
            onClick={ () => fileInputRef.current?.click() }
  disabled = { uploadingPlan }
  className = "px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
    { uploadingPlan? 'Subiendo...': '📷 Subir imagen' }
    < /button>
    < input ref = { fileInputRef } type = "file" accept = "image/*" className = "hidden"
  onChange = { e => { const f = e.target.files?.[0]; if (f) handleFloorPlanFile(f); }
} />
  < span className = "text-xs text-gray-400" > ó pegar URL: </span>
    < div className = "flex gap-2 flex-1 min-w-[180px]" >
      <input
              value={ floorPlanInput }
onChange = { e => setFloorPlanInput(e.target.value) }
placeholder = "https://..."
className = "flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
  />
  <button onClick={ handleSaveFloorPlanUrl }
className = "px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors" >
  Guardar
  < /button>
  < /div>
  < /div>
{
  hasFloorPlan && (
    <div className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2" >
            ✓ Plano cargado — coloca pins abajo en cada mesa
    < /div>
        )
}
</div>

{/* Panel agregar mesa */ }
{
  hasFloorPlan && (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" >📍 Agregar Mesa < /h3>
        < div className = "flex gap-2 items-center flex-wrap" >
          <input
              value={ newTableLabel }
  onChange = { e => setNewTableLabel(e.target.value) }
  placeholder = "Ej: Mesa 1, VIP, Familia..."
  className = "flex-1 min-w-[140px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
  onKeyDown = { e => e.key === 'Enter' && newTableLabel.trim() && setPlacingMode(true) }
    />
    <button
              onClick={ () => { if (newTableLabel.trim()) setPlacingMode(true); } }
  disabled = {!newTableLabel.trim()
}
className = {`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${placingMode ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40'
  }`}
            >
  { placingMode? '👆 Haz clic en el plano...': '+ Colocar pin' }
  < /button>
{
  placingMode && (
    <button onClick={ () => setPlacingMode(false) }
  className = "px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm" >
    Cancelar
    < /button>
            )
}
</div>
{
  placingMode && (
    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2" >
              ✦ Haz clic sobre el plano donde está "{newTableLabel}"
    < /p>
          )
}
</div>
      )}

{/* Plano interactivo */ }
{
  hasFloorPlan ? (
    <div className= "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" >
    <div
            ref={ containerRef }
  className = "relative w-full select-none"
  style = {{ cursor: placingMode ? 'crosshair' : 'default' }
}
onClick = { e => { if (!placingMode) setSelectedTable(null); handleImageClick(e); }}
onPointerMove = { handleContainerPointerMove }
onPointerUp = { handleContainerPointerUp }
  >
  <img
              ref={ imgRef }
src = { floorPlanUrl }
alt = "Plano del salón"
className = "w-full block"
style = {{ userSelect: 'none', pointerEvents: 'none' }}
draggable = { false}
  />

{
  tables.map(t => {
    const tGuests = guestsForTable(t.id);
    const isSelected = selectedTable === t.id;
    return (
      <div
                  key= { t.id }
    style = {{
      position: 'absolute',
        left: `${t.position.x}%`,
          top: `${t.position.y}%`,
            transform: 'translate(-50%, -100%)',
              zIndex: isSelected ? 20 : 10,
                cursor: draggingTable === t.id ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  }
  }
                  onPointerDown = { e => handlePinPointerDown(e, t.id)
}
  >
  {/* Pin body */ }
  < div style = {{
  background: isSelected
    ? 'linear-gradient(135deg, #d4af37, #b8860b)'
    : 'linear-gradient(135deg, #1a50a8, #2565c0)',
    border: '2px solid rgba(255,255,255,0.9)',
      borderRadius: '10px 10px 10px 2px',
        padding: '4px 8px',
          color: '#fff',
            fontSize: 11,
              fontWeight: 700,
                whiteSpace: 'nowrap',
                  boxShadow: isSelected
                    ? '0 4px 16px rgba(212,175,55,0.7)'
                    : '0 2px 8px rgba(0,0,0,0.4)',
                    fontFamily: 'Montserrat, sans-serif',
                      display: 'flex',
                        alignItems: 'center',
                          gap: 4,
                            position: 'relative',
                  }}>
  <span style={ { fontSize: 9 } }>📍</span>
{ t.label }
{
  tGuests.length > 0 && (
    <span style={ { background: 'rgba(255,255,255,0.25)', borderRadius: 8, padding: '1px 5px', fontSize: 9 } }>
      { tGuests.length }
      < /span>
                    )
}
{/* ✕ botón eliminar directo en el pin */ }
<span
                      onClick={ e => removeTable(t.id, e) }
style = {{
  marginLeft: 2,
    background: 'rgba(0,0,0,0.25)',
      borderRadius: '50%',
        width: 14,
          height: 14,
            display: 'flex',
              alignItems: 'center',
                justifyContent: 'center',
                  fontSize: 9,
                    cursor: 'pointer',
                      flexShrink: 0,
                        lineHeight: 1,
                      }}
title = "Eliminar mesa"
  >
                      ✕
</span>
  < /div>
{/* Punta del pin */ }
<div style={
  {
    width: 0, height: 0,
      borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
          borderTop: `7px solid ${isSelected ? '#d4af37' : '#1a50a8'}`,
            margin: '0 auto',
                  }
} />
  < /div>
              );
            })}

{/* Popup de detalle — lista de invitados */ }
{
  selTable && (() => {
    const tGuests = guestsForTable(selTable.id);
    // Calcular posición del popup para que no se salga
    const leftPct = selTable.position.x > 60 ? undefined : selTable.position.x;
    const rightAuto = selTable.position.x > 60;
    return (
      <div
                  style= {{
      position: 'absolute',
        left: rightAuto ? 'auto' : `${leftPct}%`,
          right: rightAuto ? `${100 - selTable.position.x}%` : 'auto',
            top: `${selTable.position.y}%`,
              transform: 'translateY(12px)',
                zIndex: 30,
                  background: 'rgba(255,255,255,0.98)',
                    border: '1px solid #e5e7eb',
                      borderRadius: 12,
                        padding: '12px 14px',
                          minWidth: 190,
                            maxWidth: 240,
                              boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
                  }
  }
                  onClick = { e => e.stopPropagation() }
    >
    {/* Header */ }
    < div style = {{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }
}>
  <span style={ { fontWeight: 700, fontSize: 13, color: '#1f2937' } }>
                      📍 { selTable.label }
</span>
  < button
onClick = {() => setSelectedTable(null)}
style = {{ color: '#9ca3af', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >
                      ✕
</button>
  < /div>

{/* Lista de invitados */ }
<div style={ { marginBottom: 8 } }>
  <p style={ { fontSize: 10, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 } }>
    Invitados({ tGuests.length })
    < /p>
{
  tGuests.length === 0 ? (
    <p style= {{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }
}> Sin invitados asignados < /p>
                    ) : (
  <div style= {{ maxHeight: 120, overflowY: 'auto' }}>
  {
    tGuests.map(g => (
      <div key= { g.id } style = {{
      fontSize: 11, color: '#374151', padding: '3px 0',
      borderBottom: '1px solid #f3f4f6',
      display: 'flex', alignItems: 'center', gap: 5,
    }} >
    <span style={ { color: '#d4af37', fontSize: 9 } }>✦</span>
{ g.name } { g.surname }
</div>
                        ))}
</div>
                    )}
</div>

{/* Info extra */ }
{
  selTable.videoUrl && (
    <p style={ { fontSize: 10, color: '#059669', marginBottom: 6 } }>🎬 Video asignado < /p>
                  )
}
<p style={ { fontSize: 9, color: '#d1d5db', marginTop: 4 } }> Arrastra el pin para reubicarlo < /p>
  < /div>
              );
            }) ()}
</div>

  < div className = "p-3 bg-gray-50 border-t border-gray-100 flex justify-between text-xs text-gray-400" >
    <span>{ tables.length } mesa{ tables.length !== 1 ? 's' : '' } · { guests.length } invitado{ guests.length !== 1 ? 's' : '' } </span>
      < span > Clic en pin para ver invitados · ✕ para eliminar < /span>
        < /div>
        < /div>
      ) : (
  <div className= "bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center" >
  <div className="text-4xl mb-3" >🏛️</div>
    < p className = "text-gray-500 text-sm font-medium mb-1" > Sin plano del salón < /p>
      < p className = "text-gray-400 text-xs" > Sube una imagen del salón para empezar a colocar mesas < /p>
        < /div>
      )}
</div>
  );
}