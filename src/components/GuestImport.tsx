import { useState, useEffect } from 'react';
import { GuestData, TableData } from '../types';
import { generateId, addGuest, getGuests, deleteGuest, getTables } from '../store';

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

  const refresh = async () => {
    const [g, t] = await Promise.all([getGuests(eventId), getTables(eventId)]);
    setGuests(g);
    setTables(t);
    onGuestsChanged();
  };

  useEffect(() => { refresh(); }, [eventId]);

  const handleAddManual = async () => {
    const name = manualName.trim();
    if (!name) return;
    const guest: GuestData = {
      id: generateId(),
      eventId,
      name,
      surname: manualSurname.trim(),
      tableId: manualTable || '',
    };
    try {
      await addGuest(guest);
      setManualName('');
      setManualSurname('');
      setManualTable('');
      await refresh();
    } catch (err) {
      console.error('addGuest error:', err);
      alert('Error al agregar invitado. Intenta de nuevo.');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteGuest(id);
    await refresh();
  };

  const filtered = guests.filter(g =>
    `${g.name} ${g.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTableName = (tableId: string) => {
    return tables.find(t => t.id === tableId)?.label ?? 'Sin mesa';
  };

  return (
    <div className= "space-y-4" >

    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" > Agregar Invitado < /h3>
        < div className = "flex flex-wrap gap-2" >
          <input
            type="text"
  value = { manualName }
  onChange = { e => setManualName(e.target.value) }
  onKeyDown = { e => e.key === 'Enter' && handleAddManual() }
  placeholder = "Nombre *"
  className = "flex-1 min-w-[110px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
    />
    <input
            type="text"
  value = { manualSurname }
  onChange = { e => setManualSurname(e.target.value) }
  onKeyDown = { e => e.key === 'Enter' && handleAddManual() }
  placeholder = "Apellido"
  className = "flex-1 min-w-[110px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
    />
    <select
            value={ manualTable }
  onChange = { e => setManualTable(e.target.value) }
  className = "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
    >
    <option value="" > Sin mesa < /option>
  {
    tables.map(t => (
      <option key= { t.id } value = { t.id } > { t.label } < /option>
    ))
  }
  </select>
    < button
  type = "button"
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
  onChange = { e => setSearchTerm(e.target.value) }
  placeholder = "Buscar..."
  className = "px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-36"
    />
    </div>
    < div className = "max-h-96 overflow-y-auto divide-y divide-gray-100" >
      {
        filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center"> No hay invitados</ p >
          )
}
{
  filtered.map(g => (
    <div key= { g.id } className = "flex items-center justify-between py-2.5 px-1 gap-2" >
    <div className="min-w-0" >
  <span className="text-sm font-medium text-gray-800" > { g.name } { g.surname } < /span>
  < span className = "ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium" >
  { getTableName(g.tableId)
}
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
