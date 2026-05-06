import { useState, useRef, useEffect } from 'react';
import { GuestData, TableData } from '../types';
import { generateId, saveGuests, getGuests, deleteGuest, getTables, saveTable } from '../store';

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
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [g, t] = await Promise.all([getGuests(eventId), getTables(eventId)]);
    setGuests(g);
    setTables(t);
    onGuestsChanged();
  };

  useEffect(() => { refresh(); }, [eventId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      let text = '';

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        text = await file.text();
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else if (file.name.endsWith('.pdf')) {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const lineMap: Record<number, string[]> = {};
          content.items.forEach((item: unknown) => {
            const it = item as { str: string; transform: number[] };
            const y = Math.round(it.transform[5]);
            if (!lineMap[y]) lineMap[y] = [];
            lineMap[y].push(it.str);
          });
          const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
          for (const y of sortedYs) {
            text += lineMap[y].join(' ') + '\n';
          }
        }
      } else {
        text = await file.text();
      }

      const parsed = await parseGuestText(text, eventId, tables);
      const existing = await getGuests(eventId);
      await saveGuests([...existing, ...parsed], eventId);
      refresh();
    } catch (err) {
      console.error('Error importing file:', err);
      alert('Error al importar el archivo. Intenta con formato CSV o texto.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const parseGuestText = async (text: string, evId: string, existingTables: TableData[]): Promise<GuestData[]> => {
    const lines = text.split(/\n/).filter(l => l.trim());
    const newGuests: GuestData[] = [];
    const tableMap = new Map<string, string>();

    existingTables.forEach(t => tableMap.set(t.label.toLowerCase().trim(), t.id));

    for (const line of lines) {
      const parts = line.split(/[,\t;|]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const name = parts[0] || '';
        const surname = parts[1] || '';
        const tableLabel = parts[2] || '';

        let tableId = '';
        if (tableLabel) {
          const key = tableLabel.toLowerCase().trim();
          if (tableMap.has(key)) {
            tableId = tableMap.get(key)!;
          } else {
            const newTable: TableData = {
              id: generateId(),
              eventId: evId,
              label: tableLabel,
              shape: 'round',
              position: { x: 50 + Math.random() * 400, y: 50 + Math.random() * 300 },
              size: { width: 80, height: 80 },
              videoUrl: '',
              videoType: '',
            };
            await saveTable(newTable);
            tableMap.set(key, newTable.id);
            tableId = newTable.id;
          }
        }

        newGuests.push({
          id: generateId(),
          eventId: evId,
          name,
          surname,
          tableId,
        });
      }
    }
    return newGuests;
  };

  const addManualGuest = async () => {
    if (!manualName.trim()) return;
    let tableId = manualTable;
    if (!tableId) {
      const t = tables.find(t => t.id === manualTable);
      tableId = t?.id || '';
    }

    const guest: GuestData = {
      id: generateId(),
      eventId,
      name: manualName.trim(),
      surname: manualSurname.trim(),
      tableId,
    };
    const existing = await getGuests(eventId);
    await saveGuests([...existing, guest], eventId);
    setManualName('');
    setManualSurname('');
    setManualTable('');
    refresh();
  };

  const removeGuest = async (id: string) => {
    await deleteGuest(id);
    refresh();
  };

  const filtered = guests.filter(g =>
    `${g.name} ${g.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTableName = (tableId: string) => {
    const t = tables.find(t => t.id === tableId);
    return t ? t.label : 'Sin mesa';
  };

  return (
    <div className= "space-y-4" >
    {/* Import */ }
    < div className = "bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" > Importar Invitados < /h3>
        < p className = "text-xs text-gray-500" > Carga un archivo CSV, Word o PDF con columnas: Nombre, Apellido, Mesa < /p>

          < div className = "flex gap-2" >
            <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer" >
              { importing? 'Importando...': 'Cargar Archivo' }
              < input ref = { fileRef } type = "file" accept = ".csv,.txt,.doc,.docx,.pdf" onChange = { handleFileUpload } className = "hidden" />
                </label>
                < button
  onClick = {() => {
    const csv = 'Nombre,Apellido,Mesa\nJuan,Perez,1\nMaria,Garcia,2\nCarlos,Lopez,1';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_invitados.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
className = "px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
  >
  Descargar Plantilla
    < /button>
    < /div>
    < /div>

{/* Manual add */ }
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
  <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" > Agregar Manualmente < /h3>
    < div className = "flex flex-wrap gap-2 items-end" >
      <input value={ manualName } onChange = { e => setManualName(e.target.value) } placeholder = "Nombre" className = "flex-1 min-w-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        <input value={ manualSurname } onChange = { e => setManualSurname(e.target.value) } placeholder = "Apellido" className = "flex-1 min-w-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <select value={ manualTable } onChange = { e => setManualTable(e.target.value) } className = "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" >
            <option value="" > Sin mesa < /option>
{
  tables.map(t => (
    <option key= { t.id } value = { t.id } > { t.label } < /option>
  ))
}
</select>
  < button onClick = { addManualGuest } className = "px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors" >
    Agregar
    < /button>
    < /div>
    < /div>

{/* Guest list */ }
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
  <div className="flex items-center justify-between" >
    <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" >
      Lista de Invitados({ guests.length })
        < /h3>
        < input
value = { searchTerm }
onChange = { e => setSearchTerm(e.target.value) }
placeholder = "Buscar..."
className = "px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-40"
  />
  </div>

  < div className = "max-h-[400px] overflow-y-auto divide-y divide-gray-100" >
    {
      filtered.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center"> No hay invitados</ p >
          )}
{
  filtered.map(g => (
    <div key= { g.id } className = "flex items-center justify-between py-2.5 px-1" >
    <div>
    <span className="text-sm font-medium text-gray-800" > { g.name } { g.surname } < /span>
  < span className = "ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium" >
  { getTableName(g.tableId)
}
</span>
  < /div>
  < button onClick = {() => removeGuest(g.id)} className = "text-red-400 hover:text-red-600 transition-colors p-1" >
    <svg xmlns="http://www.w3.org/2000/svg" className = "w-4 h-4" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" > <path d="M3 6h18" /> <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /> <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /> </svg>
      < /button>
      < /div>
          ))}
</div>
  < /div>
  < /div>
  );
}