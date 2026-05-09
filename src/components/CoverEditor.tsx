import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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

// Fixed canvas reference size — all positions are in these coordinates
const CW = 360;
const CH = 640;

// Fuentes disponibles (valor = font-family CSS)
const FONT_OPTIONS = [
  { value: 'serif', label: 'Serif (clásica)' },
  { value: 'sans-serif', label: 'Sans (moderna)' },
  { value: 'cursive', label: 'Cursiva' },
  { value: 'monospace', label: 'Mono' },
  { value: 'Great Vibes', label: 'Great Vibes ✨' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Dancing Script', label: 'Dancing Script 💃' },
  { value: 'Cinzel', label: 'Cinzel (elegante)' },
  { value: 'Raleway', label: 'Raleway (fina)' },
];

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
    fontSize: 28,
    color: '#ffffff',
    fontFamily: 'serif',
    bold: false,
    italic: false,
  });
  const [previewRotation, setPreviewRotation] = useState(0);
  // Posición local del QR durante el drag — se sincroniza al soltar
  const [qrLocalPos, setQrLocalPos] = useState<{ x: number; y: number } | null>(null);

  // Drag state
  const draggingRef = useRef<{ id: string | 'qr'; offsetX: number; offsetY: number } | null>(null);
  // Para detectar si realmente se arrastró o fue solo click
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorScaleRef = useRef(1);

  useEffect(() => {
    getCoverElements(eventId).then(els => setElements(els));
  }, [eventId]);

  const getEditorScale = useCallback(() => {
    if (!editorRef.current) return 1;
    return editorRef.current.getBoundingClientRect().width / CW;
  }, []);

  const onPointerDownElement = useCallback((e: React.PointerEvent, id: string | 'qr') => {
    e.preventDefault();
    e.stopPropagation();
    if (!editorRef.current) return;
    const scale = getEditorScale();
    editorScaleRef.current = scale;
    // Siempre calcular desde editorRef (canvas completo), no desde el elemento
    const editorRect = editorRef.current.getBoundingClientRect();
    const pointerX = (e.clientX - editorRect.left) / scale;
    const pointerY = (e.clientY - editorRect.top) / scale;
    // El offset es la diferencia entre el puntero y la posición actual del elemento
    let elemX = 0;
    let elemY = 0;
    if (id === 'qr') {
      elemX = qrPosition.x;
      elemY = qrPosition.y;
    } else {
      const el = elements.find(el => el.id === id);
      if (el) { elemX = el.position.x; elemY = el.position.y; }
    }
    draggingRef.current = {
      id,
      offsetX: pointerX - elemX,
      offsetY: pointerY - elemY,
    };
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [getEditorScale, qrPosition, elements]);

  const onPointerMoveEditor = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !editorRef.current) return;
    e.preventDefault();

    // Solo activar drag si se movió más de 5px (evita mover al hacer click)
    if (dragStartPosRef.current) {
      const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
      const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
      if (dx < 5 && dy < 5) return;
      hasDraggedRef.current = true;
    }

    const scale = editorScaleRef.current;
    const rect = editorRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(CW - 10, (e.clientX - rect.left) / scale - draggingRef.current.offsetX));
    const y = Math.max(0, Math.min(CH - 10, (e.clientY - rect.top) / scale - draggingRef.current.offsetY));
    const { id } = draggingRef.current;

    if (id === 'qr') {
      setQrLocalPos({ x, y });
    } else {
      setElements(prev =>
        prev.map(el => el.id === id ? { ...el, position: { x, y } } : el)
      );
    }
  }, [onQrPositionChange]);

  const onPointerUpEditor = useCallback((e?: React.PointerEvent) => {
    if (draggingRef.current) {
      const id = draggingRef.current.id;

      if (hasDraggedRef.current && id === 'qr') {
        // QR: guardar posición final una sola vez
        setQrLocalPos(prev => {
          if (prev) onQrPositionChange(prev);
          return null;
        });
      } else if (hasDraggedRef.current && id !== 'qr') {
        // Elemento texto/imagen: guardar posición
        setElements(prev => {
          const el = prev.find(el => el.id === id);
          if (el) saveCoverElement(el).catch(err => console.error('saveCoverElement drag error:', err));
          return prev;
        });
      } else if (!hasDraggedRef.current && id !== 'qr') {
        // Fue click — solo seleccionar
        setSelectedElement(id);
      }
    }
    draggingRef.current = null;
    dragStartPosRef.current = null;
    hasDraggedRef.current = false;
  }, []);

  // Actualizar propiedad de un elemento seleccionado y guardar en Supabase
  const updateSelectedStyle = useCallback((key: string, value: string | number) => {
    if (!selectedElement) return;
    setElements(prev => {
      const updated = prev.map(el => {
        if (el.id !== selectedElement) return el;
        const newEl: CoverElement = {
          ...el,
          style: { ...el.style, [key]: String(value) },
        };
        saveCoverElement(newEl).catch(err => console.error('updateStyle error:', err));
        return newEl;
      });
      return updated;
    });
  }, [selectedElement]);

  const addTextElement = () => {
    if (!newText.trim()) return;
    const el: CoverElement = {
      id: generateId(),
      eventId,
      elementType: 'text',
      content: newText,
      position: { x: 30, y: 100 },
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
    setElements(prev => [...prev, el]);
    setNewText('');
    saveCoverElement(el).catch(err => console.error('saveCoverElement text error:', err));
  };

  const addImageElement = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const el: CoverElement = {
          id: generateId(),
          eventId,
          elementType: 'image',
          content: reader.result as string,
          position: { x: 50, y: 150 },
          size: { width: 150, height: 150 },
          style: {},
          animation: '',
          zIndex: elements.length + 1,
        };
        setElements(prev => [...prev, el]);
        saveCoverElement(el).catch(err => console.error('saveCoverElement image error:', err));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const removeElement = async (id: string) => {
    await deleteCoverElement(id);
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedElement(null);
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
  const isRotated90 = Math.abs(previewRotation % 180) === 90;

  const ps = 0.38;
  const scaledW = CW * ps;
  const scaledH = CH * ps;
  const previewBoxW = isRotated90 ? scaledH : scaledW;
  const previewBoxH = isRotated90 ? scaledW : scaledH;

  const renderCanvas = (interactive: boolean, scale: number) => (
    <div
      style= {{
      width: CW,
      height: CH,
      position: 'relative',
      overflow: 'hidden',
      background: backgroundType === 'color' ? accentColor : '#111',
        transformOrigin: 'top left',
          transform: `scale(${scale})`,
            flexShrink: 0,
              userSelect: 'none',
      }}
    >
  { backgroundType === 'image' && backgroundUrl && (
    <img
          src={ backgroundUrl }
alt = ""
draggable = { false}
style = {{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', pointerEvents: 'none' }}
/>
      )}
{
  backgroundType === 'video' && backgroundUrl && (
    <video src={ backgroundUrl } autoPlay loop muted playsInline style = {{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }
} />
      )}
{
  !backgroundUrl && backgroundType !== 'color' && (
    <div style={ { position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1a1a2e,#16213e)', pointerEvents: 'none' } } />
      )
}
<div style={ { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.15),transparent,rgba(0,0,0,0.25))', pointerEvents: 'none' } } />
  < AnimationCanvas animation = { animation } accentColor = { accentColor } />

  {
    elements.map(el => (
      <div
          key= { el.id }
          style = {{
      position: 'absolute',
      left: el.position.x,
      top: el.position.y,
      zIndex: el.zIndex,
      cursor: interactive ? 'grab' : 'default',
      outline: interactive && selectedElement === el.id ? '2px solid #f59e0b' : 'none',
      outlineOffset: 2,
      touchAction: interactive ? 'none' : 'auto',
      userSelect: 'none',
    }}
onPointerDown = { interactive?(e) => onPointerDownElement(e, el.id) : undefined }
  >
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
                  pointerEvents: 'none',
            }
}>
  { el.content }
  < /div>
          )}
{
  el.elementType === 'image' && (
    <img src={ el.content } alt = "" draggable = { false} style = {{ width: el.size.width, height: el.size.height, objectFit: 'contain', pointerEvents: 'none' }
} />
          )}
</div>
      ))}

{/* QR */ }
<div
        style={ { position: 'absolute', left: (interactive && qrLocalPos ? qrLocalPos.x : qrPosition.x), top: (interactive && qrLocalPos ? qrLocalPos.y : qrPosition.y), cursor: interactive ? 'grab' : 'default', zIndex: 50, touchAction: 'none', userSelect: 'none' } }
onPointerDown = { interactive?(e) => onPointerDownElement(e, 'qr'): undefined }
  >
  <div style={ { background: 'white', padding: 8, borderRadius: 10, width: qrSize, height: qrSize } }>
    <QRCodeSVG value={ guestPageUrl } size = { Math.max(20, qrSize - 16) } />
      </div>
      < /div>

      < /div>
  );

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

  < div className = "flex flex-wrap gap-2 items-center" >
    <input
            value={ newText }
onChange = { e => setNewText(e.target.value) }
onKeyDown = { e => e.key === 'Enter' && addTextElement() }
placeholder = "Texto para la portada..."
className = "flex-1 min-w-[140px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
  />
  <input type="number" value = { newTextStyle.fontSize } onChange = { e => setNewTextStyle(p => ({ ...p, fontSize: +e.target.value }))} className = "w-14 px-2 py-2 border border-gray-200 rounded-lg text-sm" min = "8" max = "120" />
    <input type="color" value = { newTextStyle.color } onChange = { e => setNewTextStyle(p => ({ ...p, color: e.target.value }))} className = "w-8 h-8 rounded cursor-pointer border-0" />
      <select
            value={ newTextStyle.fontFamily }
onChange = { e => setNewTextStyle(p => ({ ...p, fontFamily: e.target.value }))}
className = "px-2 py-2 border border-gray-200 rounded-lg text-sm"
  >
{
  FONT_OPTIONS.map(f => (
    <option key= { f.value } value = { f.value } style = {{ fontFamily: f.value }} > { f.label } < /option>
            ))}
</select>
  < button onClick = {() => setNewTextStyle(p => ({ ...p, bold: !p.bold }))} className = {`px-2 py-2 rounded-lg text-sm font-bold border ${newTextStyle.bold ? 'bg-amber-400 text-white border-amber-400' : 'bg-gray-100 text-gray-700 border-gray-200'}`}> B < /button>
    < button onClick = {() => setNewTextStyle(p => ({ ...p, italic: !p.italic }))} className = {`px-2 py-2 rounded-lg text-sm italic border ${newTextStyle.italic ? 'bg-amber-400 text-white border-amber-400' : 'bg-gray-100 text-gray-700 border-gray-200'}`}> I < /button>
      < button onClick = { addTextElement } className = "px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors" > + Texto < /button>
        < button onClick = { addImageElement } className = "px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors" > + Imagen < /button>
          < /div>

          < div className = "flex flex-wrap gap-4 items-center" >
            <label className="flex items-center gap-2 text-sm text-gray-600" >
              Animación:
<select value={ animation } onChange = { e => onAnimationChange(e.target.value as AnimationType) } className = "px-2 py-1.5 border border-gray-200 rounded-lg text-sm" >
{
  ANIMATION_OPTIONS.map(opt => <option key={ opt.value } value = { opt.value } > { opt.label } < /option>)}
    < /select>
    < /label>
    < label className = "flex items-center gap-2 text-sm text-gray-600 flex-1" >
    Tamaño QR:
    <input type="range" min = "60" max = "250" value = { qrSize } onChange = { e => onQrSizeChange(+ e.target.value)
} className = "flex-1 accent-amber-500" />
  <span className="text-xs text-gray-400 w-10" > { qrSize }px < /span>
    < /label>
    < /div>
    < /div>

{/* Editor + Preview */ }
<div className="flex flex-col lg:flex-row gap-6 items-start" >

  {/* EDITOR — full size 360×640, draggable */ }
  < div className = "flex-shrink-0" >
    <p className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide" > Editor — arrastra los elementos < /p>

{/* Panel de edición — fuera del canvas, no tapa el texto */ }
{
  selected && selected.elementType === 'text' && (
    <div className="mb-2 bg-white border border-amber-300 rounded-xl px-3 py-2 flex flex-wrap gap-2 items-center shadow-sm" style = {{ maxWidth: CW }
}>
  <span className="text-xs font-semibold text-amber-600 mr-1" >✏️ Editando texto < /span>
    < label className = "flex items-center gap-1 text-xs text-gray-600" >
      Tam:
<input
                  type="number" min = { 8} max = { 120}
value = { Number(selected.style.fontSize) || 24}
onChange = { e => updateSelectedStyle('fontSize', + e.target.value)}
className = "w-14 px-1.5 py-1 border border-gray-200 rounded-lg text-xs"
  />
  </label>
  < label className = "flex items-center gap-1 text-xs text-gray-600" >
    Color:
<input
                  type="color"
value = { String(selected.style.color || '#ffffff') }
onChange = { e => updateSelectedStyle('color', e.target.value) }
className = "w-7 h-7 border-0 cursor-pointer rounded"
  />
  </label>
  < select
value = { String(selected.style.fontFamily || 'serif') }
onChange = { e => updateSelectedStyle('fontFamily', e.target.value) }
className = "px-1.5 py-1 border border-gray-200 rounded-lg text-xs"
  >
{
  FONT_OPTIONS.map(f => (
    <option key= { f.value } value = { f.value } style = {{ fontFamily: f.value }} > { f.label } < /option>
                ))}
</select>
  < button
onClick = {() => updateSelectedStyle('bold', selected.style.bold === 'true' ? 'false' : 'true')}
className = {`px-2 py-1 rounded-lg text-xs font-bold border ${selected.style.bold === 'true' ? 'bg-amber-400 text-white border-amber-400' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
              > B < /button>
  < button
onClick = {() => updateSelectedStyle('italic', selected.style.italic === 'true' ? 'false' : 'true')}
className = {`px-2 py-1 rounded-lg text-xs italic border ${selected.style.italic === 'true' ? 'bg-amber-400 text-white border-amber-400' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
              > I < /button>
  < button onClick = {() => removeElement(selected.id)} className = "px-2 py-1 bg-red-500 text-white rounded-lg text-xs border-none cursor-pointer" > Eliminar < /button>
    < button onClick = {() => setSelectedElement(null)} className = "px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs border-none cursor-pointer" >✕</button>
      < /div>
          )}
{
  selected && selected.elementType !== 'text' && (
    <div className="mb-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex gap-2 items-center shadow-sm" style = {{ maxWidth: CW }
}>
  <span className="text-xs font-semibold text-gray-500 mr-1" >🖼️ Imagen seleccionada < /span>
    < button onClick = {() => removeElement(selected.id)} className = "px-2 py-1 bg-red-500 text-white rounded-lg text-xs border-none cursor-pointer" > Eliminar < /button>
      < button onClick = {() => setSelectedElement(null)} className = "px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs border-none cursor-pointer" >✕</button>
        < /div>
          )}
<div
            ref={ editorRef }
style = {{
  width: CW,
    height: CH,
      position: 'relative',
        borderRadius: 14,
          overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              border: '1.5px solid #e5e7eb',
                cursor: 'default',
                  touchAction: 'none',
            }}
onPointerMove = { onPointerMoveEditor }
onPointerUp = { onPointerUpEditor }
onPointerLeave = { onPointerUpEditor }
  >
  { renderCanvas(true, 1) }
  < /div>
  < /div>

{/* PREVIEW — scaled + rotated */ }
<div className="flex-shrink-0" >
  <div className="flex items-center justify-between mb-1.5 gap-3" >
    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide" > Vista previa < /p>
      < div className = "flex gap-1" >
      {
        [0, 90, 180, 270].map(deg => (
          <button
                  key= { deg }
                  onClick = {() => setPreviewRotation(deg)}
className = {`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${previewRotation === deg ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
  { deg }°
</button>
              ))}
</div>
  < /div>

  < div
style = {{
  width: previewBoxW,
    height: previewBoxH,
      position: 'relative',
        overflow: 'hidden',
          borderRadius: 12,
            border: '2.5px solid #1f2937',
              background: '#000',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            }}
          >
  <div
              style={
  {
    position: 'absolute',
      top: '50%',
        left: '50%',
          width: scaledW,
            height: scaledH,
              marginLeft: -scaledW / 2,
                marginTop: -scaledH / 2,
                  transform: `rotate(${previewRotation}deg)`,
                    transformOrigin: 'center center',
                      transition: 'transform 0.35s ease',
                        overflow: 'hidden',
                          borderRadius: 4,
              }
}
            >
  { renderCanvas(false, ps) }
  < /div>

  < div style = {{ position: 'absolute', top: 6, right: 8, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 10, padding: '2px 7px', borderRadius: 20 }}>
    { previewRotation }°
</div>
  < /div>

  < p className = "text-xs text-gray-400 mt-1 text-center" >
    { isRotated90? '↔ Pantalla horizontal': '↕ Pantalla vertical' }
    < /p>
    < /div>
    < /div>
    < /div>
  );
}