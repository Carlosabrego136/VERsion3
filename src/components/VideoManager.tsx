import { useState, useEffect } from 'react';
import { TableData } from '../types';
import { getTables, saveTable, getGuests } from '../store';

interface VideoManagerProps {
  eventId: string;
}

export default function VideoManager({ eventId }: VideoManagerProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const [t, g] = await Promise.all([getTables(eventId), getGuests(eventId)]);
      setTables(t);
      const names: Record<string, string> = {};
      t.forEach(table => {
        names[table.id] = g.filter(guest => guest.tableId === table.id).map(guest => `${guest.name} ${guest.surname}`).join(', ');
      });
      setGuestNames(names);
    };
    load();
  }, [eventId]);

  const handleVideoUpload = (tableId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const updated = tables.map(t => {
          if (t.id === tableId) {
            return { ...t, videoUrl: reader.result as string, videoType: file.type };
          }
          return t;
        });
        setTables(updated);
        const table = updated.find(t => t.id === tableId);
        if (table) await saveTable(table);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const removeVideo = async (tableId: string) => {
    const updated = tables.map(t => {
      if (t.id === tableId) {
        return { ...t, videoUrl: '', videoType: '' };
      }
      return t;
    });
    setTables(updated);
    const table = updated.find(t => t.id === tableId);
    if (table) await saveTable(table);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-3">Videos por Mesa</h3>
        <p className="text-xs text-gray-500 mb-4">Carga un video para cada mesa. Los invitados lo veran al escanear el QR.</p>

        {tables.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Primero agrega mesas en el paso anterior</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tables.map(t => (
              <div key={t.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-800 text-sm">Mesa {t.label}</span>
                    <div className="text-xs text-gray-400">
                      {guestNames[t.id] || 'Sin invitados'}
                    </div>
                  </div>
                  {t.videoUrl && (
                    <button onClick={() => removeVideo(t.id)} className="text-red-400 hover:text-red-600 text-xs">Quitar</button>
                  )}
                </div>

                {t.videoUrl ? (
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      src={t.videoUrl}
                      className="w-full h-32 object-cover"
                      controls
                      preload="metadata"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => handleVideoUpload(t.id)}
                    className="w-full py-6 border-2 border-dashed border-gray-300 hover:border-amber-400 rounded-lg text-sm text-gray-400 hover:text-amber-600 transition-colors flex flex-col items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    Cargar Video
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
