import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import DraggableItem from './DraggableItem';
import AnimationCanvas from './Animations';
import { CoverElement, AnimationType, ANIMATION_OPTIONS } from '../types';
import { generateId, saveCoverElement, deleteCoverElement, getCoverElements } from '../store';

interface CoverEditorProps {
  eventId: string;
  accentColor: string;
  backgroundUrl: string;
  backgroundType: string;
  qrPosition: { x: number; y: number };
  qrSize: number;
  animation: AnimationType;
  onQrPositionChange: (pos: { x: number; y: number }) => void;
  onQrSizeChange: (size: number) => void;
  onBackgroundChange: (url: string, type: string) => void;
  onAccentColorChange: (color: string) => void;
  onAnimationChange: (animation: AnimationType) => void;
  guestPageUrl: string;
}

// The "canvas" size we design on — 9:16 vertical reference
const CANVAS_W = 360;
const CANVAS_H = 640;

export default function CoverEditor({
  eventId,
  accentColor,
  backgroundUrl,
  backgroundType,
  qrPosition,
  qrSize,
  animation,
  onQrPositionChange,
  onQrSizeChange,
  onBackgroundChange,
  onAccentColorChange,
  onAnimationChange,
  guestPageUrl,
}: CoverEditorProps) {
  const [elements, setElements] = useState<CoverElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newTextStyle, setNewTextStyle] = useState({
    fontSize: 24,
    color: '#ffffff',
    fontFamily: 'serif',
    bold: false,
    italic: false,
  });
  const [previewRotation, setPreviewRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCoverElements(eventId).then(els => setElements(els));
  }, [eventId]);

  const addTextElement = async () => {
    if (!newText.trim()) return;
    const el: CoverElement = {
      id: generateId(),
      eventId,
      elementType: 'text',
      content: newText,
      position: { x: 80, y: 100 },
      size: { width: 300, height: 50 },
      style: {
        fontSize: newTextStyle.fontSize,
        color: newTextStyle.color,
        fontFamily: newTextStyle.fontFamily,
        bold: newTextStyle.bold ? 'true' : 'false',
        italic: newTextStyle.italic ? 'true' : 'false',
      },
      animation: '',
      zIndex: elements.length + 1,
    };
    await saveCoverElement(el);
    setElements(prev => [...prev, el]);
    setNewText('');
  };

  const addImageElement = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const el: CoverElement = {
          id: generateId(),
          eventId,
          elementType: 'image',
          content: reader.result as string,
          position: { x: 80, y: 100 },
          size: { width: 200, height: 200 },
          style: {},
          animation: '',
          zIndex: elements.length + 1,
        };
        await saveCoverElement(el);
        setElements(prev => [...prev, el]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleElementMove = (id: string) => (x: number, y: number) => {
    setElements(prev => {
      const updated = prev.map(el => el.id === id ? { ...el, position: { x, y } } : el);
      const el = updated.find(e => e.id === id);
      if (el) saveCoverElement(el);
      return updated;
    });
  };

  const removeElement = async (id: string) => {
    await deleteCoverElement(id);
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  const handleBackgroundUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/mp4,video/webm';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const isVideo = file.type.startsWith('video');
        onBackgroundChange(reader.result as string, isVideo ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const selected = elements.find(el => el.id === selectedElement);

  // The inner "canvas" content — renders at CANVAS_W x CANVAS_H and is scaled via CSS transform
  // scale: how much to shrink the canvas to fit inside the preview container
  // The preview always shows the full 9:16 content, just rotated as a whole
  const CoverCanvas = ({
    draggable = false,
    scale = 1,
  }: {
    draggable?: boolean;
    scale?: number;
  }) => (
    <div
      style= {{
      width: CANVAS_W,
      height: CANVAS_H,
      position: 'relative',
      overflow: 'hidden',
      background: backgroundType === 'color' ? accentColor : '#111',
        transformOrigin: 'top left',
          transform: `scale(${scale})`,
            flexShrink: 0,
      }}
ref = { draggable? containerRef: undefined }
  >
  { backgroundType === 'image' && backgroundUrl && (
    <img
          src={ backgroundUrl }
alt = "fondo"
style = {{
  position: 'absolute', inset: 0,
    width: '100%', height: '100%',
      objectFit: 'cover', objectPosition: 'center',
        pointerEvents: 'none',
          }}
/>
      )}
{
  backgroundType === 'video' && backgroundUrl && (
    <video
          src={ backgroundUrl }
          autoPlay loop muted playsInline
  style = {{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
}
/>
      )}
{
  !backgroundUrl && backgroundType !== 'color' && (
    <div style={ { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a2e, #16213e)' } } />
      )
}

<div style={ { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent, rgba(0,0,0,0.25))', pointerEvents: 'none' } } />
  < AnimationCanvas animation = { animation } accentColor = { accentColor } />

    {/* Elements */ }
{
  elements.map(el =>
    draggable ? (
      <DraggableItem
            key= { el.id }
            x = { el.position.x }
            y = { el.position.y }
            onMove = { handleElementMove(el.id)
}
containerRef = { containerRef }
className = { selectedElement === el.id ? 'ring-2 ring-amber-400 rounded' : ''}
          >
  <ElementContent el={ el } onSelect = {() => setSelectedElement(el.id)} />
    < /DraggableItem>
        ) : (
  <div
            key= { el.id }
style = {{ position: 'absolute', left: el.position.x, top: el.position.y, zIndex: el.zIndex, pointerEvents: 'none' }}
          >
  <ElementContent el={ el } />
    < /div>
        )
      )}

{/* QR */ }
{
  draggable ? (
    <DraggableItem
          x= { qrPosition.x }
          y = { qrPosition.y }
  onMove = {(x, y) => onQrPositionChange({ x, y })
}
containerRef = { containerRef }
  >
  <div style={ { background: 'white', padding: 8, borderRadius: 10, width: qrSize, height: qrSize } }>
    <QRCodeSVG value={ guestPageUrl } size = { qrSize - 16} />
      < /div>
      < /DraggableItem>
      ) : (
  <div style= {{ position: 'absolute', left: qrPosition.x, top: qrPosition.y, pointerEvents: 'none' }}>
    <div style={ { background: 'white', padding: 8, borderRadius: 10, width: qrSize, height: qrSize } }>
      <QRCodeSVG value={ guestPageUrl } size = { Math.max(30, qrSize - 16) } />
        </div>
        < /div>
      )}

{/* Selection toolbar */ }
{
  draggable && selected && (
    <div style={
      {
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '6px 10px',
            display: 'flex', gap: 8, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }
  }>
    <button
            onClick={ () => removeElement(selected.id) }
  style = {{ padding: '4px 10px', background: '#ef4444', color: 'white', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer' }
}
          >
  Eliminar
  < /button>
  < button
onClick = {() => setSelectedElement(null)}
style = {{ padding: '4px 10px', background: '#e5e7eb', color: '#374151', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer' }}
          >
  Cerrar
  < /button>
  < /div>
      )}
</div>
  );

// Preview: renders the full canvas at a small scale, then rotates the whole thing
// The outer wrapper clips to the rotated bounding box
const isRotated90 = Math.abs(previewRotation % 180) === 90;

// We need the preview container to show the correct bounding box after rotation
// When rotated 90°: visible width = CANVAS_H * previewScale, visible height = CANVAS_W * previewScale
const previewScale = 0.42; // scale factor so canvas fits in the panel
const scaledW = CANVAS_W * previewScale;
const scaledH = CANVAS_H * previewScale;
const previewBoxW = isRotated90 ? scaledH : scaledW;
const previewBoxH = isRotated90 ? scaledW : scaledH;

return (
  <div className= "space-y-4" >
  {/* Toolbar */ }
  < div className = "bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
    <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" > Portada del QR < /h3>

      < div className = "flex flex-wrap gap-2" >
        <button onClick={ handleBackgroundUpload } className = "px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors" >
          Cargar Fondo
            < /button>
            < button onClick = {() => onBackgroundChange('', 'color')} className = "px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors" >
              Quitar Fondo
                < /button>
                < label className = "flex items-center gap-2 text-sm text-gray-600" >
                  Color:
<input type="color" value = { accentColor } onChange = { e => onAccentColorChange(e.target.value) } className = "w-8 h-8 rounded cursor-pointer border-0" />
  </label>
  < /div>

  < div className = "flex flex-wrap gap-2 items-end" >
    <input
            value={ newText }
onChange = { e => setNewText(e.target.value) }
placeholder = "Texto para la portada..."
className = "flex-1 min-w-[150px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
onKeyDown = { e => e.key === 'Enter' && addTextElement() }
  />
  <input type="number" value = { newTextStyle.fontSize } onChange = { e => setNewTextStyle(p => ({ ...p, fontSize: +e.target.value }))} className = "w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm" min = "8" max = "120" title = "Tamaño" />
    <input type="color" value = { newTextStyle.color } onChange = { e => setNewTextStyle(p => ({ ...p, color: e.target.value }))} className = "w-8 h-8 rounded cursor-pointer border-0" title = "Color texto" />
      <select value={ newTextStyle.fontFamily } onChange = { e => setNewTextStyle(p => ({ ...p, fontFamily: e.target.value }))} className = "px-2 py-2 border border-gray-200 rounded-lg text-sm" >
        <option value="serif" > Serif < /option>
          < option value = "sans-serif" > Sans < /option>
            < option value = "cursive" > Cursiva < /option>
              < option value = "monospace" > Mono < /option>
                < /select>
                < button onClick = {() => setNewTextStyle(p => ({ ...p, bold: !p.bold }))} className = {`px-2 py-2 rounded-lg text-sm font-bold ${newTextStyle.bold ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-700'}`}> B < /button>
                  < button onClick = {() => setNewTextStyle(p => ({ ...p, italic: !p.italic }))} className = {`px-2 py-2 rounded-lg text-sm italic ${newTextStyle.italic ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-700'}`}> I < /button>
                    < button onClick = { addTextElement } className = "px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors" >
                      Agregar texto
                        < /button>
                        < /div>

                        < div className = "flex flex-wrap gap-2 items-center" >
                          <button onClick={ addImageElement } className = "px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors" >
                            + Cargar Imagen
                              < /button>
                              < label className = "flex items-center gap-2 text-sm text-gray-600" >
                                Animacion:
<select value={ animation } onChange = { e => onAnimationChange(e.target.value as AnimationType) } className = "px-3 py-2 border border-gray-200 rounded-lg text-sm" >
{
  ANIMATION_OPTIONS.map(opt => <option key={ opt.value } value = { opt.value } > { opt.label } < /option>)}
    < /select>
    < /label>
    < /div>

    < div className = "flex items-center gap-2" >
    <span className="text-sm text-gray-600" > Tamaño QR: </span>
  < input type = "range" min = "80" max = "300" value = { qrSize } onChange = { e => onQrSizeChange(+ e.target.value)
} className = "flex-1 accent-amber-500" />
  <span className="text-sm text-gray-500 w-12" > { qrSize }px < /span>
    < /div>
    < /div>

{/* Editor + Preview side by side */ }
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" >

  {/* Editor: fixed canvas size, scrollable if needed */ }
  < div >
  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide" > Editor — arrastra elementos < /p>
    < div
style = {{
  width: CANVAS_W,
    height: CANVAS_H,
      position: 'relative',
        borderRadius: 12,
          overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
            }}
          >
  <CoverCanvas draggable={ true } scale = { 1} />
    </div>
    < /div>

{/* Preview: same canvas, scaled + rotated */ }
<div>
  <div className="flex items-center justify-between mb-1" >
    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide" > Vista previa pantalla < /p>
      < div className = "flex gap-1" >
      {
        [0, 90, 180, 270].map(deg => (
          <button
                  key= { deg }
                  onClick = {() => setPreviewRotation(deg)}
className = {`px-2 py-1 rounded text-xs font-medium transition-colors ${previewRotation === deg ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
  { deg }°
</button>
              ))}
</div>
  < /div>

{/* Outer box matches the rotated bounding box */ }
<div
            style={
  {
    width: previewBoxW,
      height: previewBoxH,
        position: 'relative',
          overflow: 'hidden',
            borderRadius: 12,
              border: '2px solid #1f2937',
                background: '#000',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }
}
          >
  {/* Inner wrapper: centers the scaled canvas, then rotates */ }
  < div
style = {{
  position: 'absolute',
    top: '50%',
      left: '50%',
        width: scaledW,
          height: scaledH,
            marginLeft: -scaledW / 2,
              marginTop: -scaledH / 2,
                transform: `rotate(${previewRotation}deg)`,
                  transformOrigin: 'center center',
                    transition: 'transform 0.4s ease',
                      overflow: 'hidden',
                        borderRadius: 4,
              }}
            >
  <CoverCanvas draggable={ false } scale = { previewScale } />
    </div>

{/* Degree label */ }
<div style={
  {
    position: 'absolute', top: 6, right: 8,
      background: 'rgba(0,0,0,0.6)', color: 'white',
        fontSize: 11, padding: '2px 7px', borderRadius: 20,
            }
}>
  { previewRotation }°
</div>
  < /div>

  < p className = "text-xs text-gray-400 mt-1" >
    { isRotated90? 'Pantalla horizontal (rotada)': 'Pantalla vertical' }
    < /p>
    < /div>
    < /div>
    < /div>
  );
}

// Separate component to render a single element's visual
function ElementContent({ el, onSelect }: { el: CoverElement; onSelect?: () => void }) {
  if (el.elementType === 'text') {
    return (
      <div
        style= {{
      fontSize: `${el.style.fontSize || 24}px`,
        color: String(el.style.color || '#fff'),
          fontFamily: String(el.style.fontFamily || 'serif'),
            fontWeight: el.style.bold === 'true' ? 'bold' : 'normal',
              fontStyle: el.style.italic === 'true' ? 'italic' : 'normal',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                    userSelect: 'none',
                      cursor: onSelect ? 'grab' : 'default',
        }
  }
  onPointerDownCapture = { onSelect }
    >
    { el.content }
    < /div>
    );
}
if (el.elementType === 'image') {
  return (
    <img
        src= { el.content }
  alt = ""
  style = {{ width: el.size.width, height: el.size.height, objectFit: 'contain', pointerEvents: 'none' }
}
onPointerDownCapture = { onSelect }
  />
    );
  }
return null;
}