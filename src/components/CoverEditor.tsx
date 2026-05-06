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
  const [newTextStyle, setNewTextStyle] = useState({ fontSize: 24, color: '#ffffff', fontFamily: 'serif', bold: false, italic: false });
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
      position: { x: 100, y: 100 },
      size: { width: 300, height: 50 },
      style: { fontSize: newTextStyle.fontSize, color: newTextStyle.color, fontFamily: newTextStyle.fontFamily, bold: newTextStyle.bold ? 'true' : 'false', italic: newTextStyle.italic ? 'true' : 'false' },
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
          position: { x: 100, y: 100 },
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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Portada del QR</h3>

        <div className="flex flex-wrap gap-2">
          <button onClick={handleBackgroundUpload} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
            Cargar Fondo
          </button>
          <button onClick={() => onBackgroundChange('', 'color')} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
            Quitar Fondo
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Color:
            <input type="color" value={accentColor} onChange={e => onAccentColorChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Texto para la portada..."
            className="flex-1 min-w-[150px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            onKeyDown={e => e.key === 'Enter' && addTextElement()}
          />
          <input type="number" value={newTextStyle.fontSize} onChange={e => setNewTextStyle(p => ({ ...p, fontSize: +e.target.value }))} className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm" min="8" max="120" title="Tamano" />
          <input type="color" value={newTextStyle.color} onChange={e => setNewTextStyle(p => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0" title="Color" />
          <select value={newTextStyle.fontFamily} onChange={e => setNewTextStyle(p => ({ ...p, fontFamily: e.target.value }))} className="px-2 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans</option>
            <option value="cursive">Cursiva</option>
            <option value="monospace">Mono</option>
          </select>
          <button onClick={() => setNewTextStyle(p => ({ ...p, bold: !p.bold }))} className={`px-2 py-2 rounded-lg text-sm font-bold ${newTextStyle.bold ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-700'}`}>B</button>
          <button onClick={() => setNewTextStyle(p => ({ ...p, italic: !p.italic }))} className={`px-2 py-2 rounded-lg text-sm italic ${newTextStyle.italic ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-700'}`}>I</button>
          <button onClick={addTextElement} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
            Agregar
          </button>
        </div>

        <button onClick={addImageElement} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
          + Cargar Imagen
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Animacion:</span>
          <select
            value={animation}
            onChange={e => onAnimationChange(e.target.value as AnimationType)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {ANIMATION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Tamano QR:</span>
          <input type="range" min="80" max="300" value={qrSize} onChange={e => onQrSizeChange(+e.target.value)} className="flex-1 accent-amber-500" />
          <span className="text-sm text-gray-500 w-12">{qrSize}px</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden shadow-lg border border-gray-200"
        style={{
          aspectRatio: '9/16',
          maxHeight: '70vh',
          background: backgroundType === 'color' ? accentColor : undefined,
        }}
      >
        {backgroundType === 'image' && backgroundUrl && (
          <img src={backgroundUrl} alt="fondo" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {backgroundType === 'video' && backgroundUrl && (
          <video src={backgroundUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

        <AnimationCanvas animation={animation} accentColor={accentColor} />

        {elements.map(el => (
          <DraggableItem
            key={el.id}
            x={el.position.x}
            y={el.position.y}
            onMove={handleElementMove(el.id)}
            containerRef={containerRef}
            className={selectedElement === el.id ? 'ring-2 ring-amber-400 rounded' : ''}
          >
            {el.elementType === 'text' && (
              <div
                style={{
                  fontSize: `${el.style.fontSize || 24}px`,
                  color: String(el.style.color || '#fff'),
                  fontFamily: String(el.style.fontFamily || 'serif'),
                  fontWeight: el.style.bold === 'true' ? 'bold' : 'normal',
                  fontStyle: el.style.italic === 'true' ? 'italic' : 'normal',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
                onPointerDownCapture={() => setSelectedElement(el.id)}
              >
                {el.content}
              </div>
            )}
            {el.elementType === 'image' && (
              <img
                src={el.content}
                alt=""
                style={{ width: el.size.width, height: el.size.height, objectFit: 'contain', pointerEvents: 'none' }}
                onPointerDownCapture={() => setSelectedElement(el.id)}
              />
            )}
          </DraggableItem>
        ))}

        <DraggableItem
          x={qrPosition.x}
          y={qrPosition.y}
          onMove={(x, y) => onQrPositionChange({ x, y })}
          containerRef={containerRef}
        >
          <div className="bg-white p-2 rounded-lg shadow-lg" style={{ width: qrSize, height: qrSize }}>
            <QRCodeSVG value={guestPageUrl} size={qrSize - 16} />
          </div>
        </DraggableItem>

        {selected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 flex gap-2 z-50">
            <button onClick={() => removeElement(selected.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors">
              Eliminar
            </button>
            <button onClick={() => setSelectedElement(null)} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
