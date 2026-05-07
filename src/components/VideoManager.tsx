import { useState, useEffect } from 'react';
import { TableData } from '../types';
import { getTables, saveTable, getGuests } from '../store';

interface VideoManagerProps {
  eventId: string;
}

export default function VideoManager({ eventId }: VideoManagerProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const [t, g] = await Promise.all([getTables(eventId), getGuests(eventId)]);
      setTables(t);
      const names: Record<string, string> = {};
      const urls: Record<string, string> = {};
      t.forEach(table => {
        names[table.id] = g.filter(guest => guest.tableId === table.id).map(guest => `${guest.name} ${guest.surname}`).join(', ');
        urls[table.id] = table.videoUrl || '';
      });
      setGuestNames(names);
      setUrlInputs(urls);
    };
    load();
  }, [eventId]);

  const handleSaveUrl = async (tableId: string) => {
    const url = urlInputs[tableId]?.trim();
    setSaving(s => ({ ...s, [tableId]: true }));
    const updated = tables.map(t => {
      if (t.id === tableId) {
        return { ...t, videoUrl: url || '', videoType: url ? 'url' : '' };
      }
      return t;
    });
    setTables(updated);
    const table = updated.find(t => t.id === tableId);
    if (table) await saveTable(table);
    setSaving(s => ({ ...s, [tableId]: false }));
  };

  const handleRemove = async (tableId: string) => {
    setUrlInputs(u => ({ ...u, [tableId]: '' }));
    const updated = tables.map(t => {
      if (t.id === tableId) return { ...t, videoUrl: '', videoType: '' };
      return t;
    });
    setTables(updated);
    const table = updated.find(t => t.id === tableId);
    if (table) await saveTable(table);
  };

  const getVideoEmbedUrl = (url: string) => {
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return null;
  };

  return (
    <div className= "space-y-4" >
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-1" > Videos por Mesa < /h3>
        < p className = "text-xs text-gray-500 mb-4" >
          Pega la URL del video de cada mesa.Funciona con enlaces de < strong > GoDaddy, Vimeo, YouTube < /strong> o cualquier URL directa de video.
            < /p>

  {
    tables.length === 0 ? (
      <p className= "text-sm text-gray-400 text-center py-8" > Primero agrega mesas en el paso anterior < /p>
        ) : (
      <div className= "grid gap-4 sm:grid-cols-2" >
      {
        tables.map(t => (
          <div key= { t.id } className = "border border-gray-200 rounded-lg p-3 space-y-2" >
          <div className="flex items-center justify-between" >
        <div>
        <span className="font-semibold text-gray-800 text-sm" > Mesa { t.label } < /span>
        < div className = "text-xs text-gray-400" > { guestNames[t.id] || 'Sin invitados' } < /div>
        < /div>
                  {
            t.videoUrl && (
              <button onClick={() => handleRemove(t.id)} className = "text-red-400 hover:text-red-600 text-xs" >
                Quitar
                < /button>
                  )
  }
  </div>

  {/* Preview */ }
  {
    t.videoUrl && (() => {
      const embedUrl = getVideoEmbedUrl(t.videoUrl);
      if (embedUrl) {
        return (
          <div className= "rounded-lg overflow-hidden bg-black aspect-video" >
          <iframe
                          src={ embedUrl }
        className = "w-full h-full"
        allow = "autoplay; fullscreen"
        allowFullScreen
          />
          </div>
                    );
      }
      return (
        <div className= "rounded-lg overflow-hidden bg-black" >
        <video src={ t.videoUrl } className = "w-full h-32 object-cover" controls preload = "metadata" />
          </div>
                  );
    })()
  }

  {/* URL Input */ }
  <div className="flex gap-2" >
    <input
                    type="url"
  value = { urlInputs[t.id] || '' }
  onChange = { e => setUrlInputs(u => ({ ...u, [t.id]: e.target.value }))
}
placeholder = "https://vimeo.com/... o https://tudominio.com/video.mp4"
className = "flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
  />
  <button
                    onClick={ () => handleSaveUrl(t.id) }
disabled = { saving[t.id]}
className = "px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
  >
  { saving[t.id]? '...' : 'Guardar'}
  < /button>
  < /div>
  < /div>
            ))}
</div>
        )}
</div>
  < /div>
  );
}