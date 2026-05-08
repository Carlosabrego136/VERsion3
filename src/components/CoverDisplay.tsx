import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AnimationCanvas from './Animations';
import { CoverElement, AnimationType } from '../types';
import { getEvent, getCoverElements } from '../store';
import { EventData } from '../types';

// Must match CoverEditor canvas reference
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
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const [ev, els] = await Promise.all([getEvent(eventId), getCoverElements(eventId)]);
      setEvent(ev);
      setElements(els);
    };
    load();
  }, [eventId]);

  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!showControls) return;
    const t = setTimeout(() => setShowControls(false), 3500);
    return () => clearTimeout(t);
  }, [showControls]);

  const startRecording = async () => {
    if (!canvasRef.current || !event) return;

    setIsRecording(true);
    setRecordingProgress(0);
    recordedChunksRef.current = [];

    try {
      // ── 1. CANVAS DE CAPTURA — mismo ratio que la portada ──────────────────
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = CW * 3;   // 1080
      captureCanvas.height = CH * 3;  // 1920
      const ctx = captureCanvas.getContext('2d', { alpha: false })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // ── 2. PRE-CARGAR imagen de fondo (si existe) antes de grabar ──────────
      let bgImage: HTMLImageElement | null = null;
      if (event.backgroundType === 'image' && event.backgroundUrl) {
        bgImage = await new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img); // continuar aunque falle
          img.src = event.backgroundUrl;
        });
      }

      // ── 3. PRE-RENDERIZAR textos + QR con html2canvas (una sola vez) ───────
      const html2canvas = (await import('html2canvas')).default;
      const animCanvas = canvasRef.current.querySelector('canvas') as HTMLCanvasElement | null;

      // Ocultar canvas de animación para snapshot limpio de textos + QR
      if (animCanvas) animCanvas.style.visibility = 'hidden';
      // También ocultar el fondo para capturarlo por separado (evita CORS issues)
      const bgEl = canvasRef.current.querySelector('img') as HTMLImageElement | null;
      if (bgEl) bgEl.style.visibility = 'hidden';

      const overlaySnapshot = await html2canvas(canvasRef.current, {
        backgroundColor: null,   // transparente — nosotros dibujamos el fondo
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 5000,
      });

      if (animCanvas) animCanvas.style.visibility = '';
      if (bgEl) bgEl.style.visibility = '';

      // ── 4. FORMATO — mp4 nativo > webm ────────────────────────────────────
      const mp4Types = ['video/mp4;codecs=avc1', 'video/mp4;codecs=h264', 'video/mp4'];
      const webmTypes = ['video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      let chosenMime = '';
      let isNativeMp4 = false;
      for (const t of mp4Types) {
        if (MediaRecorder.isTypeSupported(t)) { chosenMime = t; isNativeMp4 = true; break; }
      }
      if (!chosenMime) {
        for (const t of webmTypes) {
          if (MediaRecorder.isTypeSupported(t)) { chosenMime = t; break; }
        }
      }

      const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: 8000000 };
      if (chosenMime) recorderOptions.mimeType = chosenMime;

      // ── 5. STREAM + RECORDER — arranca DESPUÉS del snapshot ───────────────
      const stream = captureCanvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blobType = isNativeMp4 ? 'video/mp4' : (chosenMime || 'video/webm');
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event?.name || 'evento'}_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setRecordingProgress(0);
      };

      const OW = captureCanvas.width;  // 1080
      const OH = captureCanvas.height; // 1920

      // ── 6. LOOP DE GRABACIÓN ───────────────────────────────────────────────
      const duration = 10000;
      const startTime = Date.now();

      const drawFrame = () => {
        const elapsed = Date.now() - startTime;
        setRecordingProgress(Math.min((elapsed / duration) * 100, 100));

        ctx.clearRect(0, 0, OW, OH);

        // A) Fondo: color sólido o imagen precargada (objectFit: cover)
        if (event.backgroundType === 'color' || !event.backgroundUrl) {
          ctx.fillStyle = event.accentColor || '#111';
          ctx.fillRect(0, 0, OW, OH);
        } else if (event.backgroundType === 'image' && bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
          // Replicar objectFit: cover
          const imgW = bgImage.naturalWidth;
          const imgH = bgImage.naturalHeight;
          const scaleC = Math.max(OW / imgW, OH / imgH);
          const sw = OW / scaleC;
          const sh = OH / scaleC;
          const sx = (imgW - sw) / 2;
          const sy = (imgH - sh) / 2;
          ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, OW, OH);
        } else {
          ctx.fillStyle = '#111';
          ctx.fillRect(0, 0, OW, OH);
        }

        // B) Gradiente overlay (igual al del div)
        const grad = ctx.createLinearGradient(0, 0, 0, OH);
        grad.addColorStop(0, 'rgba(0,0,0,0.15)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, OW, OH);

        // C) Canvas de animación en vivo
        if (animCanvas && animCanvas.width > 0) {
          ctx.drawImage(animCanvas, 0, 0, OW, OH);
        }

        // D) Textos + QR (snapshot estático, fondo transparente)
        ctx.drawImage(overlaySnapshot, 0, 0, OW, OH);

        if (elapsed < duration && mediaRecorderRef.current?.state === 'recording') {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        } else if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorder.stop();
        }
      };

      // Dibujar un frame antes de arrancar el recorder para que no haya frame negro inicial
      drawFrame();
      mediaRecorder.start(100);
      animationFrameRef.current = requestAnimationFrame(drawFrame);

    } catch (err) {
      console.error('Error al grabar:', err);
      alert('Error al iniciar la grabacion. Intenta de nuevo.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

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

// Vertical (0° / 180°): fit height so the 9:16 canvas shows fully centered.
// Black bars appear on the sides — that's correct.
// Horizontal (90° / 270°): scale so the canvas fills the full screen width AND height.
let scale: number;
if (isRotated90) {
  // After rotating 90°, the canvas is landscape.
  // CW becomes the height axis, CH becomes the width axis.
  // Fill both vw and vh completely.
  const scaleW = vw / CH;
  const scaleH = vh / CW;
  scale = Math.max(scaleW, scaleH);
} else {
  // Portrait: fit inside the screen without cropping
  const scaleW = vw / CW;
  const scaleH = vh / CH;
  scale = Math.max(scaleW, scaleH); // max = fill screen sin barras negras
}

const normalizedDeg = ((rotation % 360) + 360) % 360;

return (
  <div
      style= {{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}
onClick = {() => setShowControls(p => !p)}
    >
  {/* Canvas centered, scaled, then rotated */ }
  < div
ref = { canvasRef }
style = {{
  position: 'absolute',
    top: '50%',
      left: '50%',
        width: CW,
          height: CH,
            marginLeft: -(CW / 2),
              marginTop: -(CH / 2),
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                    transition: 'transform 0.5s ease',
                      overflow: 'hidden',
        }}
      >
{
  event.backgroundType === 'image' && event.backgroundUrl && (
    <img
            src={ event.backgroundUrl }
alt = ""
style = {{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
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

  {
    elements.map(el => (
      <div key= { el.id } style = {{ position: 'absolute', left: el.position.x, top: el.position.y, zIndex: el.zIndex }} >
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

<div style={ { position: 'absolute', left: event.qrPosition.x, top: event.qrPosition.y, zIndex: 50 } }>
  <div style={ { background: 'white', padding: 10, borderRadius: 12, display: 'inline-flex', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' } }>
    <QRCodeSVG value={ guestPageUrl } size = { event.qrSize } />
      </div>
      < /div>
      < /div>

{/* Recording indicator */ }
{
  isRecording && (
    <div
          style={
    {
      position: 'fixed',
        top: 20,
          left: '50%',
            transform: 'translateX(-50%)',
              background: 'rgba(220, 38, 38, 0.9)',
                backdropFilter: 'blur(10px)',
                  borderRadius: 12,
                    padding: '12px 20px',
                      zIndex: 1000,
                        display: 'flex',
                          alignItems: 'center',
                            gap: 12,
          }
  }
        >
    <div style={
    {
      width: 12,
        height: 12,
          borderRadius: '50%',
            background: '#fff',
              animation: 'pulse 1s infinite',
          }
  } />
    < span style = {{ color: 'white', fontSize: 14, fontWeight: 600 }
}>
  Grabando... { Math.round(recordingProgress) }%
    </span>
    < button
onClick = {(e) => { e.stopPropagation(); stopRecording(); }}
style = {{
  padding: '4px 12px',
    background: 'white',
      color: '#dc2626',
        border: 'none',
          borderRadius: 6,
            fontSize: 12,
              fontWeight: 600,
                cursor: 'pointer',
            }}
          >
  Detener
  < /button>
  < /div>
      )}

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
                gap: 8,
                  background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(10px)',
                      borderRadius: 24,
                        padding: '10px 16px',
                          transition: 'opacity 0.4s',
                            opacity: showControls ? 1 : 0,
                              pointerEvents: showControls ? 'auto' : 'none',
                                zIndex: 999,
                                  whiteSpace: 'nowrap',
        }
}
onClick = { e => e.stopPropagation() }
  >
  <button
          onClick={ () => setRotation(r => r - 90) }
style = {{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          ↺
</button>
  < span style = {{ color: 'white', fontSize: 13, minWidth: 36, textAlign: 'center' }}>
    { normalizedDeg }°
</span>
  < button
onClick = {() => setRotation(r => r + 90)}
style = {{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          ↻
</button>
  < div style = {{ width: 1, height: 22, background: 'rgba(255,255,255,0.25)', margin: '0 4px' }} />
{
  [0, 90, 180, 270].map(deg => (
    <button
            key= { deg }
            onClick = {() => setRotation(deg)}
style = {{
  padding: '4px 9px',
    borderRadius: 10,
      background: normalizedDeg === deg ? '#f59e0b' : 'rgba(255,255,255,0.18)',
        color: 'white',
          border: 'none',
            fontSize: 12,
              cursor: 'pointer',
                fontWeight: 600,
            }}
          >
  { deg }°
</button>
        ))}
<div style={ { width: 1, height: 22, background: 'rgba(255,255,255,0.25)', margin: '0 4px' } } />
  < button
onClick = { isRecording? stopRecording: startRecording }
disabled = { isRecording }
style = {{
  padding: '6px 14px',
    borderRadius: 12,
      background: isRecording ? '#dc2626' : '#22c55e',
        color: 'white',
          border: 'none',
            fontSize: 12,
              cursor: isRecording ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                  display: 'flex',
                    alignItems: 'center',
                      gap: 6,
          }}
        >
  <svg width="14" height = "14" viewBox = "0 0 24 24" fill = "currentColor" >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
{ isRecording ? 'Grabando...' : 'Descargar Video' }
</button>
  < /div>

  < style > {`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
  < /div>
  );
}