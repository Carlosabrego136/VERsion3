import { supabase } from './supabaseClient';
import { EventData, TableData, GuestData, CoverElement, LocationMarker } from './types';

// ============ Events ============

export async function getEvents(): Promise<EventData[]> {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getEvents', error); return []; }
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
  if (error) { console.error('saveEvent', error); return event; }
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

// ============ Guests ============

export async function getGuests(eventId: string): Promise<GuestData[]> {
  const { data, error } = await supabase.from('guests').select('*').eq('event_id', eventId);
  if (error) { console.error('getGuests', error); return []; }
  return (data || []).map(mapGuestFromDb);
}

export async function saveGuests(guests: GuestData[], eventId: string): Promise<void> {
  const { error: delError } = await supabase.from('guests').delete().eq('event_id', eventId);
  if (delError) { console.error('saveGuests delete', delError); return; }
  if (guests.length === 0) return;
  const rows = guests.map(mapGuestToDb);
  const { error: insError } = await supabase.from('guests').insert(rows);
  if (insError) console.error('saveGuests insert', insError);
}

export async function addGuest(guest: GuestData): Promise<GuestData> {
  const row = mapGuestToDb(guest);
  const { data, error } = await supabase.from('guests').insert(row).select().maybeSingle();
  if (error) { console.error('addGuest', error); return guest; }
  return data ? mapGuestFromDb(data) : guest;
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
    .ilike('first_name', name.trim())
    .ilike('last_name', surname.trim())
    .maybeSingle();
  if (error) { console.error('findGuestByName', error); return null; }
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

// ============ Location Markers (DB table: map_markers) ============

export async function getLocationMarkers(eventId: string): Promise<LocationMarker[]> {
  const { data, error } = await supabase.from('map_markers').select('*').eq('event_id', eventId);
  if (error) { console.error('getLocationMarkers', error); return []; }
  return (data || []).map(mapLocationMarkerFromDb);
}

export async function saveLocationMarker(marker: LocationMarker): Promise<LocationMarker> {
  const row = mapLocationMarkerToDb(marker);
  const { data, error } = await supabase.from('map_markers').upsert(row).select().maybeSingle();
  if (error) { console.error('saveLocationMarker', error); return marker; }
  return data ? mapLocationMarkerFromDb(data) : marker;
}

export async function deleteLocationMarker(id: string): Promise<void> {
  const { error } = await supabase.from('map_markers').delete().eq('id', id);
  if (error) console.error('deleteLocationMarker', error);
}

// ============ ID Generator ============

export function generateId(): string {
  return crypto.randomUUID();
}

// ============ DB <-> App Mappers ============
// DB has flat columns (x, y, width, height), app uses nested objects (position: {x, y})

function mapEventFromDb(row: Record<string, unknown>): EventData {
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    eventType: (row.event_type as string) || 'boda',
    eventDate: (row.event_date as string) || '',
    venue: (row.venue as string) || '',
    hostName: (row.host_name as string) || (row.celebrant_name as string) || '',
    accentColor: (row.cover_accent_color as string) || '#d4af37',
    backgroundUrl: (row.background_url as string) || '',
    backgroundType: (row.background_type as string) || 'color',
    coverConfig: { animation: row.cover_animation || 'none' },
    qrPosition: { x: (row.qr_x as number) ?? 80, y: (row.qr_y as number) ?? 80 },
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
    celebrant_name: event.hostName,
    cover_bg_color: event.accentColor,
    cover_accent_color: event.accentColor,
    cover_animation: (event.coverConfig?.animation as string) || 'none',
    background_url: event.backgroundUrl,
    background_type: event.backgroundType,
    qr_x: event.qrPosition.x,
    qr_y: event.qrPosition.y,
    qr_size: event.qrSize,
  };
}

function mapTableFromDb(row: Record<string, unknown>): TableData {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    label: (row.label as string) || String(row.table_number || ''),
    shape: (row.shape as TableData['shape']) || 'round',
    position: { x: (row.x as number) ?? 50, y: (row.y as number) ?? 50 },
    size: { width: (row.width as number) ?? 80, height: (row.height as number) ?? 80 },
    videoUrl: (row.video_url as string) || '',
    videoType: (row.video_type as string) || '',
  };
}

function mapTableToDb(table: TableData): Record<string, unknown> {
  return {
    id: table.id,
    event_id: table.eventId,
    label: table.label,
    table_number: parseInt(table.label) || 0,
    shape: table.shape,
    x: table.position.x,
    y: table.position.y,
    width: table.size.width,
    height: table.size.height,
    video_url: table.videoUrl,
    video_type: table.videoType,
  };
}

function mapGuestFromDb(row: Record<string, unknown>): GuestData {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    name: (row.first_name as string) || '',
    surname: (row.last_name as string) || '',
    tableId: (row.table_id as string) || '',
  };
}

function mapGuestToDb(guest: GuestData): Record<string, unknown> {
  return {
    id: guest.id,
    event_id: guest.eventId,
    first_name: guest.name,
    last_name: guest.surname,
    table_id: guest.tableId || null,
    table_number: 0,
  };
}

function mapCoverElementFromDb(row: Record<string, unknown>): CoverElement {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    elementType: ((row.type as string) || 'text') as CoverElement['elementType'],
    content: (row.content as string) || '',
    position: { x: (row.x as number) ?? 50, y: (row.y as number) ?? 50 },
    size: { width: (row.width as number) ?? 200, height: (row.height as number) ?? 50 },
    style: {
      fontSize: (row.font_size as number) ?? 24,
      color: (row.font_color as string) || '#ffffff',
      fontFamily: (row.font_family as string) || 'serif',
    },
    animation: (row.animation as string) || '',
    zIndex: (row.z_index as number) ?? 1,
    bold: (row.bold as boolean) ?? false,
    italic: (row.italic as boolean) ?? false,
  };
}

function mapCoverElementToDb(el: CoverElement): Record<string, unknown> {
  return {
    id: el.id,
    event_id: el.eventId,
    type: el.elementType,
    content: el.content,
    x: el.position.x,
    y: el.position.y,
    width: el.size.width,
    height: el.size.height,
    font_size: Number(el.style.fontSize) || 24,
    font_color: String(el.style.color || '#ffffff'),
    font_family: String(el.style.fontFamily || 'serif'),
    bold: el.bold ?? false,
    italic: el.italic ?? false,
    z_index: el.zIndex,
    animation: el.animation,
  };
}

function mapLocationMarkerFromDb(row: Record<string, unknown>): LocationMarker {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    markerType: (row.type as string) || 'entrance',
    label: (row.label as string) || '',
    position: { x: (row.x as number) ?? 50, y: (row.y as number) ?? 50 },
  };
}

function mapLocationMarkerToDb(marker: LocationMarker): Record<string, unknown> {
  return {
    id: marker.id,
    event_id: marker.eventId,
    type: marker.markerType,
    label: marker.label,
    x: marker.position.x,
    y: marker.position.y,
  };
}
