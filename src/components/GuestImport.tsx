import { useState, useEffect, useCallback } from 'react';
import { GuestData, TableData } from '../types';
import { generateId, addGuest, getGuests, deleteGuest, getTables, saveTable } from '../store';
import { supabase } from '../supabaseClient';

interface GuestImportProps {
  eventId: string;
  onGuestsChanged: () => void;
}

export default function GuestImport({ eventId, onGuestsChanged }: GuestImportProps) {
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualSurname, setManualSurname] = useState('');
  const [manualTable, setManualTable] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar mesas primero
      const tablesData = await getTables(eventId);
      setTables(tablesData);
      // Luego cargar invitados
      const guestsData = await getGuests(eventId);
      setGuests(guestsData);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddManual = async () => {
    const name = manualName.trim();
    if (!name) return;

    const tableLabel = manualTable.trim();
    let tableId = '';

    if (tableLabel) {
      // Buscar si ya existe una mesa con ese label (case insensitive)
      const existingTable = tables.find(t => t.label.toLowerCase() === tableLabel.toLowerCase());

      if (existingTable) {
        tableId = existingTable.id;
      } else {
        // Crear la mesa automaticamente
        const newTableId = generateId();
        const newTable: TableData = {
          id: newTableId,
          eventId,
          label: tableLabel,
          shape: 'round',
          position: { x: 100 + (tables.length % 10) * 120, y: 100 + Math.floor(tables.length / 10) * 120 },
          size: { width: 80, height: 80 },
          videoUrl: '',
          videoType: '',
        };
        try {
          const savedTable = await saveTable(newTable);
          tableId = savedTable.id;
          setTables(prev => [...prev, savedTable]);
        } catch (err) {
          console.error('Error creando mesa:', err);
        }
      }
    }

    const guestId = generateId();
    const guest: GuestData = {
      id: guestId,
      eventId,
      name,
      surname: manualSurname.trim(),
      tableId,
    };

    try {
      // Guardar invitado con table_id directamente
      const { error } = await supabase.from('guests').insert({
        id: guestId,
        event_id: eventId,
        first_name: name,
        last_name: manualSurname.trim(),
        table_id: tableId || null,
        table_number: 0,
      });

      if (error) {
        console.error('Error insertando invitado:', error);
        alert('Error al agregar invitado. Intenta de nuevo.');
        return;
      }

      setManualName('');
      setManualSurname('');
      setManualTable('');
      await loadData();
      onGuestsChanged();
    } catch (err) {
      console.error('addGuest error:', err);
      alert('Error al agregar invitado. Intenta de nuevo.');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteGuest(id);
    await loadData();
    onGuestsChanged();
  };

  const filtered = guests.filter(g =>
    `${g.name} ${g.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTableName = (tableId: string) => {
    if (!tableId) return 'Sin mesa';
    const table = tables.find(t => t.id === tableId);
    return table ? table.label : 'Sin mesa';
  };

  if (loading) {
    return (
      <div className= "flex items-center justify-center py-12" >
      <div className="text-gray-500" > Cargando...</div>
        < /div>
    );
  }

  return (
    <div className= "space-y-4" >

    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" > Agregar Invitado < /h3>
        < p className = "text-xs text-gray-500" > Escribe el numero de mesa y se creara automaticamente en la seccion Mesas < /p>
          < div className = "flex flex-wrap gap-2" >
            <input
            type="text"
  value = { manualName }
  onChange = {(e) => setManualName(e.target.value)
}
onKeyDown = {(e) => { if (e.key === 'Enter') handleAddManual(); }}
onClick = {(e) => e.stopPropagation()}
onFocus = {(e) => e.stopPropagation()}
placeholder = "Nombre *"
className = "flex-1 min-w-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
autoComplete = "off"
  />
  <input
            type="text"
value = { manualSurname }
onChange = {(e) => setManualSurname(e.target.value)}
onKeyDown = {(e) => { if (e.key === 'Enter') handleAddManual(); }}
onClick = {(e) => e.stopPropagation()}
onFocus = {(e) => e.stopPropagation()}
placeholder = "Apellido"
className = "flex-1 min-w-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
autoComplete = "off"
  />
  <input
            type="text"
value = { manualTable }
onChange = {(e) => setManualTable(e.target.value)}
onKeyDown = {(e) => { if (e.key === 'Enter') handleAddManual(); }}
onClick = {(e) => e.stopPropagation()}
onFocus = {(e) => e.stopPropagation()}
placeholder = "Mesa (ej: 1, 2, VIP)"
className = "w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
autoComplete = "off"
  />
  <button
            type="button"
onClick = { handleAddManual }
className = "px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
  >
  Agregar
  < /button>
  < /div>
  < /div>

  < div className = "bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
    <div className="flex items-center justify-between gap-2" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" >
        Lista({ guests.length })
        < /h3>
        < input
type = "text"
value = { searchTerm }
onChange = {(e) => setSearchTerm(e.target.value)}
onClick = {(e) => e.stopPropagation()}
onFocus = {(e) => e.stopPropagation()}
placeholder = "Buscar..."
className = "px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-36"
autoComplete = "off"
  />
  </div>
  < div className = "max-h-96 overflow-y-auto divide-y divide-gray-100" >
    {
      filtered.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center"> No hay invitados</ p >
          )}
{
  filtered.map(g => (
    <div key= { g.id } className = "flex items-center justify-between py-2.5 px-1 gap-2" >
    <div className="min-w-0" >
  <span className="text-sm font-medium text-gray-800" > { g.name } { g.surname } < /span>
  < span className = {`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${g.tableId ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
    }`}>
      Mesa: { getTableName(g.tableId) }
</span>
  < /div>
  < button
type = "button"
onClick = {() => handleDelete(g.id)}
className = "shrink-0 text-red-400 hover:text-red-600 transition-colors p-1"
  >
  <svg xmlns="http://www.w3.org/2000/svg" className = "w-4 h-4" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" >
    <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          < /button>
          < /div>
          ))}
</div>
  < /div>

  < /div>
  );
}
