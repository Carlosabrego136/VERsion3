import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
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

  const stopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    if (!canvasRef.current || !event) return;

    setIsRecording(true);
    setRecordingProgress(0);
    recordedChunksRef.current = [];

    try {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = CW * 2;
      captureCanvas.height = CH * 2;
      captureCanvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
      document.body.appendChild(captureCanvas);
      const ctx = captureCanvas.getContext('2d', { alpha: false })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const OW = captureCanvas.width;
      const OH = captureCanvas.height;

      let bgImage: HTMLImageElement | null = null;
      if (event.backgroundType === 'image' && event.backgroundUrl) {
        bgImage = await new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = event.backgroundUrl;
        });
      }

      const html2canvas = (await import('html2canvas')).default;
      const animCanvas = canvasRef.current.querySelector('canvas') as HTMLCanvasElement | null;
      const bgEl = canvasRef.current.querySelector('img') as HTMLImageElement | null;
      const qrWrapEl = canvasRef.current.querySelector('[data-qr-wrap]') as HTMLElement | null;

      if (animCanvas) animCanvas.style.visibility = 'hidden';
      if (bgEl) bgEl.style.visibility = 'hidden';
      if (qrWrapEl) qrWrapEl.style.visibility = 'hidden';

      const overlaySnapshot = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 5000,
      });

      if (animCanvas) animCanvas.style.visibility = '';
      if (bgEl) bgEl.style.visibility = '';
      if (qrWrapEl) qrWrapEl.style.visibility = '';

      const qrCanvasEl = canvasRef.current.querySelector('[data-qr-canvas] canvas') as HTMLCanvasElement | null;

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

      const stream = captureCanvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        document.body.removeChild(captureCanvas);
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

      const qrX = event.qrPosition.x * 2;
      const qrY = event.qrPosition.y * 2;
      const qrSize = event.qrSize * 2;
      const qrPad = 10 * 2;

      const duration = 10000;
      const startTime = Date.now();

      const drawFrame = () => {
        const elapsed = Date.now() - startTime;
        setRecordingProgress(Math.min((elapsed / duration) * 100, 100));

        ctx.clearRect(0, 0, OW, OH);

        if (event.backgroundType === 'color' || !event.backgroundUrl) {
          ctx.fillStyle = event.accentColor || '#111';
          ctx.fillRect(0, 0, OW, OH);
        } else if (event.backgroundType === 'image' && bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
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

        const grad = ctx.createLinearGradient(0, 0, 0, OH);
        grad.addColorStop(0, 'rgba(0,0,0,0.15)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, OW, OH);

        if (animCanvas && animCanvas.width > 0) {
          ctx.drawImage(animCanvas, 0, 0, OW, OH);
        }

        ctx.drawImage(overlaySnapshot, 0, 0, OW, OH);

        if (qrCanvasEl && qrCanvasEl.width > 0) {
          ctx.save();
          const r = 12 * 2;
          ctx.beginPath();
          ctx.moveTo(qrX + r, qrY);
          ctx.arcTo(qrX + qrSize, qrY, qrX + qrSize, qrY + qrSize, r);
          ctx.arcTo(qrX + qrSize, qrY + qrSize, qrX, qrY + qrSize, r);
          ctx.arcTo(qrX, qrY + qrSize, qrX, qrY, r);
          ctx.arcTo(qrX, qrY, qrX + qrSize, qrY, r);
          ctx.closePath();
          ctx.fillStyle = 'white';
          ctx.fill();
          ctx.drawImage(qrCanvasEl, qrX + qrPad, qrY + qrPad, qrSize - qrPad * 2, qrSize - qrPad * 2);
          ctx.restore();
        }

        if (elapsed < duration && mediaRecorderRef.current?.state === 'recording') {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        } else if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorder.stop();
        }
      };

      drawFrame();
      mediaRecorder.start(100);
      animationFrameRef.current = requestAnimationFrame(drawFrame);

    } catch (err) {
      console.error('Error al grabar:', err);
      alert('Error al iniciar la grabacion. Intenta de nuevo.');
      setIsRecording(false);
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

let scale: number;
if (isRotated90) {
  const scaleW = vw / CH;
  const scaleH = vh / CW;
  scale = Math.max(scaleW, scaleH);
} else {
  const scaleW = vw / CW;
  const scaleH = vh / CH;
  scale = Math.max(scaleW, scaleH);
}

const normalizedDeg = ((rotation % 360) + 360) % 360;

return (
  <div
      style= {{ position: 'fixed', inset: 0, background: event.accentColor || '#111', overflow: 'hidden' }}
onClick = {() => setShowControls(p => !p)}
    >
  <div
        ref={ canvasRef }
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
    elements.map((el: CoverElement) => (
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

<div data - qr - wrap="" style = {{ position: 'absolute', left: event.qrPosition.x, top: event.qrPosition.y, zIndex: 50 }}>
  <div data - qr - canvas="" style = {{ background: 'white', padding: 10, borderRadius: 12, width: event.qrSize, height: event.qrSize, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
    <QRCodeCanvas value={ guestPageUrl } size = { event.qrSize - 20 } />
      </div>
      < /div>
      < /div>

{
  isRecording && (
    <div style={
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
  }>
    <div style={ { width: 12, height: 12, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' } } />
      < span style = {{ color: 'white', fontSize: 14, fontWeight: 600 }
}>
  Grabando... { Math.round(recordingProgress) }%
    </span>
    < button
onClick = {(e) => { e.stopPropagation(); stopRecording(); }}
style = {{ padding: '4px 12px', background: 'white', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
  Detener
  < /button>
  < /div>
      )}

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