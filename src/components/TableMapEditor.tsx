import { useState, useRef, useEffect } from 'react';
import DraggableItem from './DraggableItem';
import { TableData, LocationMarker, TABLE_SHAPES, MARKER_TYPES } from '../types';
import { generateId, saveTable, deleteTable, getTables, saveLocationMarker, deleteLocationMarker, getLocationMarkers, getGuests } from '../store';

interface TableMapEditorProps {
  eventId: string;
}

export default function TableMapEditor({ eventId }: TableMapEditorProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [newTableShape, setNewTableShape] = useState<TableData['shape']>('round');
  const [tableGuests, setTableGuests] = useState<Record<string, number>>({});
  const [mapExpanded, setMapExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const [t, m, g] = await Promise.all([getTables(eventId), getLocationMarkers(eventId), getGuests(eventId)]);
    setTables(t);
    setMarkers(m);
    const counts: Record<string, number> = {};
    g.forEach(guest => { counts[guest.tableId] = (counts[guest.tableId] || 0) + 1; });
    setTableGuests(counts);
  };

  useEffect(() => { refresh(); }, [eventId]);

  // Manejar ESC para salir de pantalla completa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mapExpanded) {
        setMapExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapExpanded]);

  const addTable = async () => {
    if (!newTableLabel.trim()) return;
    const t: TableData = {
      id: generateId(),
      eventId,
      label: newTableLabel.trim(),
      shape: newTableShape,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { width: 80, height: 80 },
      videoUrl: '',
      videoType: '',
    };
    await saveTable(t);
    setNewTableLabel('');
    refresh();
  };

  const addMarker = async (type: string) => {
    const m: LocationMarker = {
      id: generateId(),
      eventId,
      markerType: type,
      label: MARKER_TYPES.find(mt => mt.value === type)?.label || type,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
    };
    await saveLocationMarker(m);
    refresh();
  };

  const handleTableMove = (id: string) => (x: number, y: number) => {
    setTables(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, position: { x, y } } : t);
      const t = updated.find(t => t.id === id);
      if (t) saveTable(t);
      return updated;
    });
  };

  const handleMarkerMove = (id: string) => (x: number, y: number) => {
    setMarkers(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, position: { x, y } } : m);
      const m = updated.find(m => m.id === id);
      if (m) saveLocationMarker(m);
      return updated;
    });
  };

  const removeTable = async (id: string) => {
    await deleteTable(id);
    if (selectedTable === id) setSelectedTable(null);
    refresh();
  };

  const removeMarker = async (id: string) => {
    await deleteLocationMarker(id);
    if (selectedMarker === id) setSelectedMarker(null);
    refresh();
  };

  const getShapeClass = (shape: string) => {
    const base = 'flex items-center justify-center text-xs font-bold shadow-md transition-all';
    switch (shape) {
      case 'round': return `${base} rounded-full`;
      case 'rect': return `${base} rounded-lg`;
      case 'oval': return `${base} rounded-full`;
      case 'square': return `${base} rounded-md`;
      default: return `${base} rounded-full`;
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'entrance': return '\u{1F6AA}';
      case 'exit': return '\u{1F6B6}';
      case 'stage': return '\u{1F3A4}';
      case 'bar': return '\u{1F378}';
      case 'dancefloor': return '\u{1F483}';
      case 'buffet': return '\u{1F37D}';
      case 'restroom': return '\u{1F6BB}';
      case 'dj': return '\u{1F3A7}';
      default: return '\u{1F4CD}';
    }
  };

  const selTable = tables.find(t => t.id === selectedTable);
  const selMarker = markers.find(m => m.id === selectedMarker);

  // Contenido del mapa (reutilizado en ambos modos)
  const mapContent = (
    <>
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #999 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {tables.map(t => (
        <DraggableItem
          key={t.id}
          x={t.position.x}
          y={t.position.y}
          onMove={handleTableMove(t.id)}
          containerRef={containerRef}
        >
          <div
            className={getShapeClass(t.shape)}
            style={{
              width: t.size.width,
              height: t.size.height,
              background: selectedTable === t.id
                ? 'linear-gradient(135deg, #d4af37, #c9956b)'
                : 'linear-gradient(135deg, #f5f0e8, #e8dcc8)',
              border: selectedTable === t.id ? '3px solid #b8860b' : '2px solid #d4af37',
              color: selectedTable === t.id ? '#fff' : '#8b7355',
            }}
            onPointerDownCapture={() => { setSelectedTable(t.id); setSelectedMarker(null); }}
          >
            <div className="text-center leading-tight">
              <div className="text-sm font-bold">{t.label}</div>
              <div className="text-[10px] opacity-70">{tableGuests[t.id] || 0} personas</div>
            </div>
          </div>
        </DraggableItem>
      ))}

      {markers.map(m => (
        <DraggableItem
          key={m.id}
          x={m.position.x}
          y={m.position.y}
          onMove={handleMarkerMove(m.id)}
          containerRef={containerRef}
        >
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm transition-all ${selectedMarker === m.id ? 'ring-2 ring-amber-400 bg-amber-50' : 'bg-white/90'}`}
            onPointerDownCapture={() => { setSelectedMarker(m.id); setSelectedTable(null); }}
          >
            <span>{getMarkerIcon(m.markerType)}</span>
            <span className="text-gray-700">{m.label}</span>
          </div>
        </DraggableItem>
      ))}

      {selTable && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 z-50 min-w-[250px]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800">Mesa {selTable.label}</span>
            <button onClick={() => removeTable(selTable.id)} className="text-red-400 hover:text-red-600 text-sm">Eliminar</button>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Forma: {TABLE_SHAPES.find(s => s.value === selTable.shape)?.label}</div>
            <div>Invitados: {tableGuests[selTable.id] || 0}</div>
            <div>Video: {selTable.videoUrl ? 'Cargado' : 'Sin video'}</div>
          </div>
          <button onClick={() => setSelectedTable(null)} className="mt-2 w-full px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
            Cerrar
          </button>
        </div>
      )}

      {selMarker && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800">{getMarkerIcon(selMarker.markerType)} {selMarker.label}</span>
            <button onClick={() => removeMarker(selMarker.id)} className="text-red-400 hover:text-red-600 text-sm">Eliminar</button>
          </div>
          <button onClick={() => setSelectedMarker(null)} className="w-full px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
            Cerrar
          </button>
        </div>
      )}
    </>
  );

  // Modal de pantalla completa
  if (mapExpanded) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black">
        {/* Barra de herramientas en pantalla completa */}
        <div className="absolute top-0 left-0 right-0 z-[10000] bg-white/95 backdrop-blur-sm border-b border-gray-200 p-3">
          <div className="flex flex-wrap items-center gap-2 max-w-screen-xl mx-auto">
            <input
              value={newTableLabel}
              onChange={e => setNewTableLabel(e.target.value)}
              placeholder="Numero de mesa"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-32"
              onKeyDown={e => e.key === 'Enter' && addTable()}
            />
            <select value={newTableShape} onChange={e => setNewTableShape(e.target.value as TableData['shape'])} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {TABLE_SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={addTable} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
              + Mesa
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            {MARKER_TYPES.map(mt => (
              <button
                key={mt.value}
                onClick={() => addMarker(mt.value)}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 transition-colors"
              >
                {getMarkerIcon(mt.value)} {mt.label}
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-xs text-gray-500">Mesas: {tables.length} | ESC para salir</span>
            <button
              onClick={() => setMapExpanded(false)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Canvas del mapa en pantalla completa */}
        <div
          ref={containerRef}
          className="absolute top-16 left-0 right-0 bottom-0 overflow-auto"
          style={{ background: 'linear-gradient(135deg, #f8f6f0 0%, #f0ece4 100%)' }}
        >
          <div 
            className="relative"
            style={{ 
              width: '4000px', 
              height: '3000px',
              minWidth: '100%',
              minHeight: '100%'
            }}
          >
            {mapContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Mapa de Mesas</h3>

        <div className="flex flex-wrap gap-2 items-end">
          <input
            value={newTableLabel}
            onChange={e => setNewTableLabel(e.target.value)}
            placeholder="Numero de mesa"
            className="flex-1 min-w-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            onKeyDown={e => e.key === 'Enter' && addTable()}
          />
          <select value={newTableShape} onChange={e => setNewTableShape(e.target.value as TableData['shape'])} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            {TABLE_SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={addTable} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
            + Mesa
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {MARKER_TYPES.map(mt => (
            <button
              key={mt.value}
              onClick={() => addMarker(mt.value)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
            >
              {getMarkerIcon(mt.value)} {mt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expand button */}
      <div className="flex justify-end">
        <button
          onClick={() => setMapExpanded(true)}
          className="px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-medium transition-colors"
        >
          {'⤢ Expandir mapa (pantalla completa)'}
        </button>
      </div>

      {/* Map canvas */}
      <div
        ref={containerRef}
        className="relative w-full bg-gray-50 rounded-xl overflow-hidden shadow-lg border border-gray-200"
        style={{ minHeight: '500px', height: '60vh', background: 'linear-gradient(135deg, #f8f6f0 0%, #f0ece4 100%)' }}
      >
        {mapContent}
      </div>
    </div>
  );
}
