import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AnimationCanvas from './Animations';
import { CoverElement, AnimationType } from '../types';
import { getEvent, getCoverElements } from '../store';
import { EventData } from '../types';

// Must match CoverEditor canvas reference size
const CW = 360;
const CH = 640;

interface CoverDisplayProps {
  eventId: string;
}

export default function CoverDisplay({ eventId }: CoverDisplayProps) {
  const [rotation, setRotation] = useState(0);
  const [event, setEvent] = useState<EventData | null>(null);
  const [elements, setElements] = useState<CoverElement[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [ev, els] = await Promise.all([getEvent(eventId), getCoverElements(eventId)]);
      setEvent(ev);
      setElements(els);
    };
    load();
  }, [eventId]);

  // Hide controls after 3s of no interaction
  useEffect(() => {
    const t = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(t);
  }, [showControls]);

  // Recalculate on resize
  useEffect(() => {
    const onResize = () => forceUpdate(n => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!event) {
    return (
      <div style= {{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }>
    <p style={ { color: 'white', fontSize: 20 } }> Cargando...</p>
      < /div>
    );
}

const animation = (event.coverConfig?.animation as AnimationType) || 'none';
const guestPageUrl = `${window.location.origin}${window.location.pathname}#guest/${eventId}`;

const isRotated90 = Math.abs(rotation % 180) === 90;

// Screen dimensions
const screenW = window.innerWidth;
const screenH = window.innerHeight;

// The canvas (CW x CH = 360x640) needs to fill the screen.
// When NOT rotated: fit vertically (portrait)
// When rotated 90/270: the canvas is sideways, so we need it to fill the landscape screen
// We scale the canvas so that when rotated it covers the full viewport.
let scale: number;
if (isRotated90) {
  // After rotating 90°, canvas width (CW) becomes screen height, canvas height (CH) becomes screen width
  // Scale so: CW * scale >= screenH AND CH * scale >= screenW
  const scaleByH = screenH / CW;
  const scaleByW = screenW / CH;
  scale = Math.max(scaleByH, scaleByW);
} else {
  // Normal portrait: fit CW to screenW, CH to screenH, use larger scale to cover
  const scaleByW = screenW / CW;
  const scaleByH = screenH / CH;
  scale = Math.max(scaleByW, scaleByH);
}

return (
  <div
      style= {{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}
onClick = {() => setShowControls(p => !p)}
    >
  {/* Canvas — centered, scaled to fill screen, then rotated */ }
  < div
style = {{
  position: 'absolute',
    top: '50%',
      left: '50%',
        width: CW,
          height: CH,
            marginLeft: -CW / 2,
              marginTop: -CH / 2,
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                    transition: 'transform 0.5s ease',
        }}
      >
  {/* Background */ }
{
  event.backgroundType === 'image' && event.backgroundUrl && (
    <img
            src={ event.backgroundUrl }
  alt = ""
  style = {{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }
}
/>
        )}
{
  event.backgroundType === 'video' && event.backgroundUrl && (
    <video
            src={ event.backgroundUrl }
            autoPlay loop muted playsInline
  style = {{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
}
/>
        )}
{
  (!event.backgroundUrl || event.backgroundType === 'color') && (
    <div style={ { position: 'absolute', inset: 0, background: event.accentColor || '#111' } } />
        )
}

<div style={ { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.15),transparent,rgba(0,0,0,0.25))', pointerEvents: 'none' } } />
  < AnimationCanvas animation = { animation } accentColor = { event.accentColor } />

    {/* Elements at exact saved positions */ }
{
  elements.map(el => (
    <div key= { el.id } style = {{ position: 'absolute', left: el.position.x, top: el.position.y, zIndex: el.zIndex }}>
    {
      el.elementType === 'text' && (
        <div style={
          {
            fontSize: `${el.style.fontSize || 24}px`,
              color: String(el.style.color || '#fff'),
                fontFamily: String(el.style.fontFamily || 'serif'),
                  fontWeight: el.style.bold === 'true' ? 'bold' : 'normal',
                    fontStyle: el.style.italic === 'true' ? 'italic' : 'normal',
                      textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                        whiteSpace: 'nowrap',
              }
}>
  { el.content }
  < /div>
            )}
{
  el.elementType === 'image' && (
    <img src={ el.content } alt = "" style = {{ width: el.size.width, height: el.size.height, objectFit: 'contain' }
} />
            )}
</div>
        ))}

{/* QR at exact saved position */ }
<div style={ { position: 'absolute', left: event.qrPosition.x, top: event.qrPosition.y, zIndex: 50 } }>
  <div style={ { background: 'white', padding: 10, borderRadius: 12, width: event.qrSize, height: event.qrSize, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' } }>
    <QRCodeSVG value={ guestPageUrl } size = { event.qrSize - 20 } />
      </div>
      < /div>
      < /div>

{/* Controls */ }
<div
        style={
  {
    position: 'fixed',
      bottom: 20,
        left: '50%',
          transform: 'translateX(-50%)',
            display: 'flex',
              alignItems: 'center',
                gap: 10,
                  background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(10px)',
                      borderRadius: 24,
                        padding: '10px 18px',
                          transition: 'opacity 0.4s',
                            opacity: showControls ? 1 : 0,
                              pointerEvents: showControls ? 'auto' : 'none',
                                zIndex: 999,
        }
}
onClick = { e => e.stopPropagation() }
  >
  <button
          onClick={ () => setRotation(r => r - 90) }
style = {{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', color: 'white', border: 'none', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >↺</button>
  < span style = {{ color: 'white', fontSize: 13, minWidth: 44, textAlign: 'center' }}> {((rotation % 360) + 360) % 360}°</span>
    < button
onClick = {() => setRotation(r => r + 90)}
style = {{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', color: 'white', border: 'none', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >↻</button>
  < div style = {{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />
{
  [0, 90, 180, 270].map(deg => (
    <button
            key= { deg }
            onClick = {() => setRotation(deg)}
style = {{
  padding: '4px 10px',
    borderRadius: 10,
      background: ((rotation % 360) + 360) % 360 === deg ? '#f59e0b' : 'rgba(255,255,255,0.18)',
        color: 'white',
          border: 'none',
            fontSize: 12,
              cursor: 'pointer',
                fontWeight: 600,
            }}
          > { deg }°</button>
        ))}
</div>
  < /div>
  );
}