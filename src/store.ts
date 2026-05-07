import { supabase } from './supabaseClient';
import { EventData, TableData, GuestData, CoverElement, LocationMarker } from './types';

// ============ Events ============

export async function getEvents(): Promise<EventData[]> {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('getEvents', error);
    throw new Error(`Error cargando eventos: ${error.message}`);
  }
  return (data || []).map(mapEventFromDb);
}

export async function getEvent(id: string): Promise<EventData | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error) { console.error('getEvent', error); return null; }
  return data ? mapEventFromDb(data) : null;
}

export async function saveEvent(event: EventData): Promise<EventData> {
  const row = mapEventToDb(event);
  const { data, error } = await supabase.from('events').upsert(row).select().maybeSingle();
  if (error) {
    console.error('saveEvent', error);
    throw new Error(`Error guardando evento: ${error.message}`);
  }
  return data ? mapEventFromDb(data) : event;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) console.error('deleteEvent', error);
}

// ============ Tables ============

export async function getTables(eventId: string): Promise<TableData[]> {
  const { data, error } = await supabase.from('tables').select('*').eq('event_id', eventId);
  if (error) { console.error('getTables', error); return []; }
  return (data || []).map(mapTableFromDb);
}

export async function saveTable(table: TableData): Promise<TableData> {
  const row = mapTableToDb(table);
  const { data, error } = await supabase.from('tables').upsert(row).select().maybeSingle();
  if (error) { console.error('saveTable', error); return table; }
  return data ? mapTableFromDb(data) : table;
}

export async function deleteTable(id: string): Promise<void> {
  const { error } = await supabase.from('tables').delete().eq('id', id);
  if (error) console.error('deleteTable', error);
}

// Buscar mesa por label
export async function findTableByLabel(eventId: string, label: string): Promise<TableData | null> {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('event_id', eventId)
    .eq('label', label.trim())
    .maybeSingle();
  if (error) { console.error('findTableByLabel', error); return null; }
  return data ? mapTableFromDb(data) : null;
}

// ============ Guests ============

export async function getGuests(eventId: string): Promise<GuestData[]> {
  const { data, error } = await supabase.from('guests').select('*').eq('event_id', eventId);
  if (error) { console.error('getGuests', error); return []; }
  return (data || []).map(mapGuestFromDb);
}

export async function saveGuest(guest: GuestData): Promise<GuestData> {
  const row = mapGuestToDb(guest);
  const { data, error } = await supabase.from('guests').upsert(row).select().maybeSingle();
  if (error) { console.error('saveGuest', error); return guest; }
  return data ? mapGuestFromDb(data) : guest;
}

export async function saveGuestsBatch(guests: GuestData[]): Promise<void> {
  if (guests.length === 0) return;

  // Dividir en lotes de 50 para evitar timeouts con muchos invitados
  const batchSize = 50;
  for (let i = 0; i < guests.length; i += batchSize) {
    const batch = guests.slice(i, i + batchSize);
    const rows = batch.map(mapGuestToDb);
    const { error } = await supabase.from('guests').upsert(rows);
    if (error) {
      console.error('saveGuestsBatch error:', error);
      throw error;
    }
  }
}

export async function addGuest(guest: GuestData): Promise<GuestData> {
  const row = mapGuestToDb(guest);
  const { data, error } = await supabase.from('guests').insert(row).select().maybeSingle();
  if (error) { console.error('addGuest', error); return guest; }
  return data ? mapGuestFromDb(data) : guest;
}

export async function updateGuestTable(guestId: string, tableId: string | null): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({ table_id: tableId })
    .eq('id', guestId);
  if (error) console.error('updateGuestTable', error);
}

export async function deleteGuest(id: string): Promise<void> {
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) console.error('deleteGuest', error);
}

export async function findGuestByName(eventId: string, name: string, surname: string): Promise<GuestData | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .ilike('name', name.trim())
    .ilike('surname', surname.trim())
    .maybeSingle();
  if (error) { console.error('findGuestByName', error); return null; }
  return data ? mapGuestFromDb(data) : null;
}

export async function getGuestById(guestId: string): Promise<GuestData | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .maybeSingle();
  if (error) { console.error('getGuestById', error); return null; }
  return data ? mapGuestFromDb(data) : null;
}

// ============ Cover Elements ============

export async function getCoverElements(eventId: string): Promise<CoverElement[]> {
  const { data, error } = await supabase.from('cover_elements').select('*').eq('event_id', eventId);
  if (error) { console.error('getCoverElements', error); return []; }
  return (data || []).map(mapCoverElementFromDb);
}

export async function saveCoverElement(el: CoverElement): Promise<CoverElement> {
  const row = mapCoverElementToDb(el);
  const { data, error } = await supabase.from('cover_elements').upsert(row).select().maybeSingle();
  if (error) { console.error('saveCoverElement', error); return el; }
  return data ? mapCoverElementFromDb(data) : el;
}

export async function deleteCoverElement(id: string): Promise<void> {
  const { error } = await supabase.from('cover_elements').delete().eq('id', id);
  if (error) console.error('deleteCoverElement', error);
}

// ============ Location Markers ============

export async function getLocationMarkers(eventId: string): Promise<LocationMarker[]> {
  const { data, error } = await supabase.from('location_markers').select('*').eq('event_id', eventId);
  if (error) { console.error('getLocationMarkers', error); return []; }
  return (data || []).map(mapLocationMarkerFromDb);
}

export async function saveLocationMarker(marker: LocationMarker): Promise<LocationMarker> {
  const row = mapLocationMarkerToDb(marker);
  const { data, error } = await supabase.from('location_markers').upsert(row).select().maybeSingle();
  if (error) { console.error('saveLocationMarker', error); return marker; }
  return data ? mapLocationMarkerFromDb(data) : marker;
}

export async function deleteLocationMarker(id: string): Promise<void> {
  const { error } = await supabase.from('location_markers').delete().eq('id', id);
  if (error) console.error('deleteLocationMarker', error);
}

// ============ ID Generator ============

export function generateId(): string {
  return crypto.randomUUID();
}

// ============ DB <-> App Mappers ============

function mapEventFromDb(row: Record<string, unknown>): EventData {
  const coverConfig = row.cover_config as Record<string, unknown> | null;
  const qrPos = row.qr_position as Record<string, unknown> | null;
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    eventType: (row.event_type as string) || 'boda',
    eventDate: (row.event_date as string) || '',
    venue: (row.venue as string) || '',
    hostName: (row.host_name as string) || '',
    accentColor: (row.accent_color as string) || '#d4af37',
    backgroundUrl: (row.background_url as string) || '',
    backgroundType: (row.background_type as string) || 'color',
    coverConfig: coverConfig || {},
    qrPosition: { x: (qrPos?.x as number) ?? 80, y: (qrPos?.y as number) ?? 80 },
    qrSize: (row.qr_size as number) ?? 150,
  };
}

function mapEventToDb(event: EventData): Record<string, unknown> {
  return {
    id: event.id,
    name: event.name,
    event_type: event.eventType,
    event_date: event.eventDate || null,
    venue: event.venue,
    host_name: event.hostName,
    accent_color: event.accentColor,
    background_url: event.backgroundUrl,
    background_type: event.backgroundType,
    cover_config: event.coverConfig || {},
    qr_position: event.qrPosition,
    qr_size: event.qrSize,
  };
}

function mapTableFromDb(row: Record<string, unknown>): TableData {
  const pos = row.position as Record<string, unknown> | null;
  const sz = row.size as Record<string, unknown> | null;
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    label: (row.label as string) || '',
    shape: (row.shape as TableData['shape']) || 'round',
    position: { x: (pos?.x as number) ?? 50, y: (pos?.y as number) ?? 50 },
    size: { width: (sz?.width as number) ?? 80, height: (sz?.height as number) ?? 80 },
    videoUrl: (row.video_url as string) || '',
    videoType: (row.video_type as string) || '',
  };
}

function mapTableToDb(table: TableData): Record<string, unknown> {
  return {
    id: table.id,
    event_id: table.eventId,
    label: table.label,
    shape: table.shape,
    position: table.position,
    size: table.size,
    video_url: table.videoUrl || '',
    video_type: table.videoType || '',
  };
}

function mapGuestFromDb(row: Record<string, unknown>): GuestData {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    name: (row.name as string) || '',
    surname: (row.surname as string) || '',
    tableId: (row.table_id as string) || '',
  };
}

function mapGuestToDb(guest: GuestData): Record<string, unknown> {
  return {
    id: guest.id,
    event_id: guest.eventId,
    name: guest.name,
    surname: guest.surname,
    table_id: guest.tableId || null,
  };
}

function mapCoverElementFromDb(row: Record<string, unknown>): CoverElement {
  const pos = row.position as Record<string, unknown> | null;
  const sz = row.size as Record<string, unknown> | null;
  const style = row.style as Record<string, unknown> | null;
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    elementType: ((row.element_type as string) || 'text') as CoverElement['elementType'],
    content: (row.content as string) || '',
    position: { x: (pos?.x as number) ?? 50, y: (pos?.y as number) ?? 50 },
    size: { width: (sz?.width as number) ?? 200, height: (sz?.height as number) ?? 50 },
    style: {
      fontSize: (style?.fontSize as number) ?? 24,
      color: (style?.color as string) || '#ffffff',
      fontFamily: (style?.fontFamily as string) || 'serif',
    },
    animation: (row.animation as string) || '',
    zIndex: (row.z_index as number) ?? 1,
    bold: (style?.bold as boolean) ?? false,
    italic: (style?.italic as boolean) ?? false,
  };
}

function mapCoverElementToDb(el: CoverElement): Record<string, unknown> {
  return {
    id: el.id,
    event_id: el.eventId,
    element_type: el.elementType,
    content: el.content,
    position: el.position,
    size: el.size,
    style: {
      fontSize: el.style.fontSize,
      color: el.style.color,
      fontFamily: el.style.fontFamily,
      bold: el.bold,
      italic: el.italic,
    },
    z_index: el.zIndex,
    animation: el.animation,
  };
}

function mapLocationMarkerFromDb(row: Record<string, unknown>): LocationMarker {
  const pos = row.position as Record<string, unknown> | null;
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    markerType: (row.marker_type as string) || 'entrance',
    label: (row.label as string) || '',
    position: { x: (pos?.x as number) ?? 50, y: (pos?.y as number) ?? 50 },
  };
}

function mapLocationMarkerToDb(marker: LocationMarker): Record<string, unknown> {
  return {
    id: marker.id,
    event_id: marker.eventId,
    marker_type: marker.markerType,
    label: marker.label,
    position: marker.position,
  };
}
