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

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url);

  const getEmbedUrl = (url: string) => {
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return null;
  };

  const handleSaveUrl = async (tableId: string) => {
    const url = urlInputs[tableId]?.trim();
    setSaving(s => ({ ...s, [tableId]: true }));
    const updated = tables.map(t => {
      if (t.id === tableId) return { ...t, videoUrl: url || '', videoType: url ? 'url' : '' };
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

  return (
    <div className= "space-y-4" >
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-1" > Videos e Imágenes por Mesa < /h3>
        < p className = "text-xs text-gray-500 mb-4" >
          Pega la URL del video o imagen de cada mesa.Funciona con < strong > GoDaddy < /strong> (.mp4, .jpg, .png), <strong>Vimeo</strong > y < strong > YouTube < /strong>.
            < /p>

  {
    tables.length === 0 ? (
      <p className= "text-sm text-gray-400 text-center py-8" > Primero agrega mesas en el paso anterior < /p>
        ) : (
      <div className= "grid gap-4 sm:grid-cols-2" >
      {
        tables.map(t => {
          const currentUrl = t.videoUrl || '';
          const embedUrl = currentUrl ? getEmbedUrl(currentUrl) : null;
          const isImg = currentUrl ? isImage(currentUrl) : false;

          return (
            <div key= { t.id } className = "border border-gray-200 rounded-lg p-3 space-y-2" >
              <div className="flex items-center justify-between" >
                <div>
                <span className="font-semibold text-gray-800 text-sm" > Mesa { t.label } </span>
                  < div className = "text-xs text-gray-400" > { guestNames[t.id] || 'Sin invitados' } < /div>
                    < /div>
                    < div className = "flex items-center gap-2" >
                      { currentUrl && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200" >
                          { isImg? '🖼 Imagen': '🎬 Video' }
                          < /span>
                      )
      }
    {
      currentUrl && (
        <button onClick={ () => handleRemove(t.id) } className = "text-red-400 hover:text-red-600 text-xs" >
          Quitar
          < /button>
                      )
    }
    </div>
      < /div>

    {/* Preview */ }
    {
      currentUrl && (() => {
        if (embedUrl) return (
          <div className= "rounded-lg overflow-hidden bg-black aspect-video" >
          <iframe src={ embedUrl } className = "w-full h-full" allow = "autoplay; fullscreen" allowFullScreen />
            </div>
                    );
        if (isImg) return (
          <div className= "rounded-lg overflow-hidden bg-gray-100" >
          <img src={ currentUrl } alt = "preview" className = "w-full h-32 object-cover" />
            </div>
                    );
        return (
          <div className= "rounded-lg overflow-hidden bg-black" >
          <video src={ currentUrl } className = "w-full h-32 object-cover" controls preload = "metadata" />
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
  placeholder = "https://videos.creativeartvideo.com/M1.mp4"
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
              );
})}
</div>
        )}
</div>
  < /div>
  );
}