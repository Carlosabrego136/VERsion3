export interface EventData {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  venue: string;
  hostName: string;
  accentColor: string;
  backgroundUrl: string;
  backgroundType: string;
  coverConfig: Record<string, unknown>;
  qrPosition: { x: number; y: number };
  qrSize: number;
  floorPlanUrl: string;
}

export interface TableData {
  id: string;
  eventId: string;
  label: string;
  shape: 'round' | 'rect' | 'oval' | 'square';
  position: { x: number; y: number };
  size: { width: number; height: number };
  videoUrl: string;
  videoType: string;
}

export interface GuestData {
  id: string;
  eventId: string;
  name: string;
  surname: string;
  tableId: string;
}

export interface CoverElement {
  id: string;
  eventId: string;
  elementType: 'text' | 'image' | 'qr';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Record<string, string | number>;
  animation: string;
  zIndex: number;
  bold?: boolean;
  italic?: boolean;
}

export interface LocationMarker {
  id: string;
  eventId: string;
  markerType: string;
  label: string;
  position: { x: number; y: number };
}

export type AnimationType = 'none' | 'butterflies' | 'stars' | 'petals' | 'sparkles' | 'hearts' | 'confetti' | 'leaves';

export const ANIMATION_OPTIONS: { value: AnimationType; label: string }[] = [
  { value: 'none', label: 'Sin animacion' },
  { value: 'butterflies', label: 'Mariposas' },
  { value: 'stars', label: 'Estrellas' },
  { value: 'petals', label: 'Petals' },
  { value: 'sparkles', label: 'Destellos' },
  { value: 'hearts', label: 'Corazones' },
  { value: 'confetti', label: 'Confeti' },
  { value: 'leaves', label: 'Hojas' },
];

export const EVENT_TYPES = [
  { value: 'xv', label: 'XV Anos' },
  { value: 'boda', label: 'Boda' },
  { value: 'cumpleanos', label: 'Cumpleanos' },
  { value: 'graduacion', label: 'Graduacion' },
  { value: 'bautizo', label: 'Bautizo' },
  { value: 'otro', label: 'Otro' },
];

export const MARKER_TYPES = [
  { value: 'entrance', label: 'Entrada' },
  { value: 'exit', label: 'Salida' },
  { value: 'stage', label: 'Escenario' },
  { value: 'bar', label: 'Bar' },
  { value: 'dancefloor', label: 'Pista de Baile' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'restroom', label: 'Banos' },
  { value: 'dj', label: 'DJ' },
];

export const TABLE_SHAPES = [
  { value: 'round', label: 'Redonda' },
  { value: 'rect', label: 'Rectangular' },
  { value: 'oval', label: 'Ovalada' },
  { value: 'square', label: 'Cuadrada' },
];