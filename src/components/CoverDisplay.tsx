import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AnimationCanvas from './Animations';
import { CoverElement, AnimationType } from '../types';
import { getEvent, getCoverElements } from '../store';
import { EventData } from '../types';

interface CoverDisplayProps {
  eventId: string;
}

export default function CoverDisplay({ eventId }: CoverDisplayProps) {
  const [rotation, setRotation] = useState(0);
  const [event, setEvent] = useState<EventData | null>(null);
  const [elements, setElements] = useState<CoverElement[]>([]);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [ev, els] = await Promise.all([getEvent(eventId), getCoverElements(eventId)]);
      setEvent(ev);
      setElements(els);
    };
    load();
  }, [eventId]);

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  const animation = (event.coverConfig?.animation as AnimationType) || 'none';
  const guestPageUrl = `${window.location.origin}${window.location.pathname}#guest/${eventId}`;

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      onMouseMove={() => setShowControls(true)}
      onClick={() => setShowControls(prev => !prev)}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          transition: 'transform 0.5s ease',
          background: event.backgroundType === 'color' ? event.accentColor : undefined,
        }}
      >
        {event.backgroundType === 'image' && event.backgroundUrl && (
          <img src={event.backgroundUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {event.backgroundType === 'video' && event.backgroundUrl && (
          <video src={event.backgroundUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

        <AnimationCanvas animation={animation} accentColor={event.accentColor} />

        {elements.map(el => (
          <div
            key={el.id}
            className="absolute"
            style={{
              left: el.position.x,
              top: el.position.y,
              zIndex: el.zIndex,
            }}
          >
            {el.elementType === 'text' && (
              <div style={{
                fontSize: `${el.style.fontSize || 24}px`,
                color: String(el.style.color || '#fff'),
                fontFamily: String(el.style.fontFamily || 'serif'),
                fontWeight: el.style.bold === 'true' ? 'bold' : 'normal',
                fontStyle: el.style.italic === 'true' ? 'italic' : 'normal',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}>
                {el.content}
              </div>
            )}
            {el.elementType === 'image' && (
              <img src={el.content} alt="" style={{ width: el.size.width, height: el.size.height, objectFit: 'contain' }} />
            )}
          </div>
        ))}

        <div
          className="absolute"
          style={{
            left: event.qrPosition.x,
            top: event.qrPosition.y,
          }}
        >
          <div className="bg-white p-3 rounded-xl shadow-2xl" style={{ width: event.qrSize, height: event.qrSize }}>
            <QRCodeSVG value={guestPageUrl} size={event.qrSize - 24} />
          </div>
        </div>
      </div>

      {/* Rotation controls */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-2xl px-5 py-3 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setRotation(r => r - 90)}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-lg font-bold"
          title="Rotar -90"
        >
          &#8634;
        </button>
        <div className="text-white text-sm font-medium min-w-[50px] text-center">{rotation}&deg;</div>
        <button
          onClick={() => setRotation(r => r + 90)}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-lg font-bold"
          title="Rotar +90"
        >
          &#8635;
        </button>
        <div className="w-px h-6 bg-white/20" />
        <button
          onClick={() => setRotation(0)}
          className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors"
        >
          0&deg;
        </button>
        <button
          onClick={() => setRotation(180)}
          className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors"
        >
          180&deg;
        </button>
        <div className="w-px h-6 bg-white/20" />
        <input
          type="range"
          min="0"
          max="360"
          value={rotation}
          onChange={e => setRotation(+e.target.value)}
          className="w-24 accent-amber-400"
        />
      </div>
    </div>
  );
}
