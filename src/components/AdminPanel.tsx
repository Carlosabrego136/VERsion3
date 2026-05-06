import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { EventData, EVENT_TYPES, AnimationType } from '../types';
import { generateId, saveEvent, getEvent, getEvents, deleteEvent } from '../store';
import CoverEditor from './CoverEditor';
import GuestImport from './GuestImport';
import TableMapEditor from './TableMapEditor';
import VideoManager from './VideoManager';

const STEPS = [
  { id: 1, label: 'Evento', icon: '\u{1F4CB}' },
  { id: 2, label: 'Portada', icon: '\u{1F3A8}' },
  { id: 3, label: 'Invitados', icon: '\u{1F465}' },
  { id: 4, label: 'Mesas', icon: '\u{1FA91}' },
  { id: 5, label: 'Videos', icon: '\u{1F3AC}' },
  { id: 6, label: 'Pantalla', icon: '\u{1F4F1}' },
];

export default function AdminPanel() {
  const [step, setStep] = useState(1);
  const [eventList, setEventList] = useState<EventData[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [guestRefreshKey, setGuestRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const events = await getEvents();
    setEventList(events);
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    if (currentEventId) {
      getEvent(currentEventId).then(ev => setEvent(ev));
    }
  }, [currentEventId]);

  const createNewEvent = async () => {
    const newEvent: EventData = {
      id: generateId(),
      name: '',
      eventType: 'boda',
      eventDate: '',
      venue: '',
      hostName: '',
      accentColor: '#d4af37',
      backgroundUrl: '',
      backgroundType: 'color',
      coverConfig: {},
      qrPosition: { x: 80, y: 80 },
      qrSize: 150,
    };
    await saveEvent(newEvent);
    setCurrentEventId(newEvent.id);
    setEvent(newEvent);
    loadEvents();
    setStep(1);
  };

  const selectEvent = (id: string) => {
    setCurrentEventId(id);
    setStep(1);
  };

  const removeEvent = async (id: string) => {
    await deleteEvent(id);
    loadEvents();
    if (currentEventId === id) {
      setCurrentEventId(null);
      setEvent(null);
    }
  };

  const updateEvent = async (updates: Partial<EventData>) => {
    if (!event) return;
    const updated = { ...event, ...updates };
    setEvent(updated);
    await saveEvent(updated);
  };

  const guestPageUrl = currentEventId ? `${window.location.origin}${window.location.pathname}#guest/${currentEventId}` : '';
  const coverPageUrl = currentEventId ? `${window.location.origin}${window.location.pathname}#cover/${currentEventId}` : '';

  // Event list view
  if (!currentEventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">MesaQR</h1>
            <p className="text-gray-500 mt-2">Crea invitaciones interactivas con QR para tu evento</p>
          </div>

          <button
            onClick={createNewEvent}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-lg font-semibold shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98]"
          >
            + Crear Nuevo Evento
          </button>

          {loading && <p className="text-center text-gray-400 mt-8">Cargando...</p>}

          {eventList.length > 0 && (
            <div className="mt-8 space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mis Eventos</h2>
              {eventList.map(ev => (
                <div key={ev.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                  <button onClick={() => selectEvent(ev.id)} className="flex-1 text-left">
                    <div className="font-semibold text-gray-800">{ev.name || 'Sin nombre'}</div>
                    <div className="text-sm text-gray-400">
                      {EVENT_TYPES.find(t => t.value === ev.eventType)?.label} {ev.eventDate && `- ${ev.eventDate}`}
                    </div>
                  </button>
                  <button onClick={() => removeEvent(ev.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!event) return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => { setCurrentEventId(null); setEvent(null); }} className="text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium">
            &larr; Eventos
          </button>
          <h1 className="font-bold text-gray-800">{event.name || 'Nuevo Evento'}</h1>
          <button
            onClick={() => window.open(coverPageUrl, '_blank')}
            className="text-amber-600 hover:text-amber-700 text-sm font-medium transition-colors"
          >
            Ver Pantalla
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto py-3 gap-1 scrollbar-hide">
            {STEPS.map(s => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  step === s.id
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : step > s.id
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="text-base">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Step 1: Event Info */}
        {step === 1 && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Informacion del Evento</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Evento</label>
                <input value={event.name} onChange={e => updateEvent({ name: e.target.value })} placeholder="Ej: XV de Valentina" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
                <select value={event.eventType} onChange={e => updateEvent({ eventType: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={event.eventDate} onChange={e => updateEvent({ eventDate: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                <input value={event.venue} onChange={e => updateEvent({ venue: e.target.value })} placeholder="Ej: Salon Los Encinos" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Anfitrion</label>
                <input value={event.hostName} onChange={e => updateEvent({ hostName: e.target.value })} placeholder="Ej: Familia Garcia" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>

            <button onClick={() => setStep(2)} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 transition-all">
              Siguiente: Portada &rarr;
            </button>
          </div>
        )}

        {/* Step 2: Cover Design */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <CoverEditor
              eventId={event.id}
              accentColor={event.accentColor}
              backgroundUrl={event.backgroundUrl}
              backgroundType={event.backgroundType}
              qrPosition={event.qrPosition}
              qrSize={event.qrSize}
              animation={(event.coverConfig?.animation as AnimationType) || 'none'}
              onQrPositionChange={pos => updateEvent({ qrPosition: pos })}
              onQrSizeChange={size => updateEvent({ qrSize: size })}
              onBackgroundChange={(url, type) => updateEvent({ backgroundUrl: url, backgroundType: type })}
              onAccentColorChange={color => updateEvent({ accentColor: color })}
              onAnimationChange={anim => updateEvent({ coverConfig: { ...event.coverConfig, animation: anim } })}
              guestPageUrl={guestPageUrl}
            />
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all">
                &larr; Atras
              </button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 transition-all">
                Siguiente: Invitados &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Guest Import */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <GuestImport eventId={event.id} onGuestsChanged={() => setGuestRefreshKey(k => k + 1)} key={guestRefreshKey} />
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all">
                &larr; Atras
              </button>
              <button onClick={() => setStep(4)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 transition-all">
                Siguiente: Mesas &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Table Map */}
        {step === 4 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <TableMapEditor eventId={event.id} />
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all">
                &larr; Atras
              </button>
              <button onClick={() => setStep(5)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 transition-all">
                Siguiente: Videos &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Videos */}
        {step === 5 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <VideoManager eventId={event.id} />
            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all">
                &larr; Atras
              </button>
              <button onClick={() => setStep(6)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 transition-all">
                Siguiente: Pantalla &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Screen / QR Final */}
        {step === 6 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Pantalla del Evento</h2>
              <p className="text-sm text-gray-500">Abre la pantalla en una nueva ventana y ponla en la pantalla de tu evento. Los invitados escanearan el QR que aparece ahi.</p>

              <button
                onClick={() => window.open(coverPageUrl, '_blank')}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-lg font-semibold shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
              >
                Abrir Pantalla del Evento
              </button>

              <div className="border-t border-gray-100 pt-5 space-y-4">
                <h3 className="font-semibold text-gray-800">Codigo QR</h3>
                <p className="text-xs text-gray-400">Este es el QR que aparece en la pantalla. Los invitados lo escanean para buscar su nombre y ver su video + mesa.</p>

                <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-md">
                    <QRCodeSVG value={guestPageUrl} size={200} />
                  </div>
                  <div className="text-sm text-gray-600 text-center break-all">{guestPageUrl}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const svg = document.querySelector('.bg-white.p-4 svg');
                      if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(svgBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `qr-${event.name || 'evento'}.svg`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    }}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 transition-all"
                  >
                    Descargar QR
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(guestPageUrl)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
                  >
                    Copiar URL
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setStep(5)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all">
              &larr; Atras
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
