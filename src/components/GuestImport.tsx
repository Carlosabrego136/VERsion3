import { useState, useRef, useEffect } from 'react';
import { GuestData, TableData } from '../types';
import { generateId, addGuest, getGuests, deleteGuest, getTables, saveTable } from '../store';

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
  const [importCount, setImportCount] = useState<number | null>(null);
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
    setImportCount(null);

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
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          // Group text items by Y coordinate (rounded to nearest 2px to handle tiny shifts)
          const lineMap: Map<number, { x: number; str: string }[]> = new Map();
          for (const item of content.items) {
            const it = item as { str: string; transform: number[] };
            if (!it.str.trim()) continue;
            const y = Math.round(it.transform[5] / 2) * 2; // round to 2px buckets
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y)!.push({ x: it.transform[4], str: it.str });
          }

          // Sort rows top→bottom (descending Y in PDF coords), items left→right
          const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
          for (const y of sortedYs) {
            const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
            // Join items - if item already ends with comma don't add another
            const line = items.map(i => i.str.trim()).filter(Boolean).join(',');
            if (line) text += line + '\n';
          }
        }
      } else {
        text = await file.text();
      }

      const currentTables = await getTables(eventId);
      const parsed = await parseGuestText(text, eventId, currentTables);

      // Use addGuest for each one - does NOT delete existing guests
      let added = 0;
      for (const g of parsed) {
        await addGuest(g);
        added++;
      }

      setImportCount(added);
      refresh();
    } catch (err) {
      console.error('Error importing file:', err);
      alert('Error al importar el archivo. Verifica que el formato sea: Nombre,Apellido,Mesa');
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
      const trimmed = line.trim();
      // Skip header row
      if (/^nombre[,;\t|]/i.test(trimmed)) continue;

      const parts = trimmed.split(/[,;\t|]/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) continue;

      const name = parts[0];
      const surname = parts[1];
      const tableLabel = parts[2] || '';

      // Skip if still a header
      if (name.toLowerCase() === 'nombre') continue;

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
    return newGuests;
  };

  const addManualGuest = async () => {
    if (!manualName.trim()) return;

    const guest: GuestData = {
      id: generateId(),
      eventId,
      name: manualName.trim(),
      surname: manualSurname.trim(),
      tableId: manualTable || '',
    };

    // Use addGuest (single insert) instead of saveGuests (delete-all + insert)
    await addGuest(guest);
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
        < p className = "text-xs text-gray-500" >
          Carga un archivo CSV, Word o PDF con columnas: <strong>Nombre, Apellido, Mesa < /strong>
            < /p>

            < div className = "flex gap-2 flex-wrap" >
              <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer" >
                { importing? 'Importando...': 'Cargar Archivo' }
                < input
  ref = { fileRef }
  type = "file"
  accept = ".csv,.txt,.doc,.docx,.pdf"
  onChange = { handleFileUpload }
  className = "hidden"
    />
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

{
  importCount !== null && (
    <p className="text-sm text-green-600 font-medium" >
            ✅ { importCount } invitados importados correctamente
    < /p>
        )
}
</div>

{/* Manual add */ }
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
  <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" > Agregar Manualmente < /h3>
    < div className = "flex flex-wrap gap-2 items-end" >
      <input
            value={ manualName }
onChange = { e => setManualName(e.target.value) }
onKeyDown = { e => e.key === 'Enter' && addManualGuest() }
placeholder = "Nombre"
className = "flex-1 min-w-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
  />
  <input
            value={ manualSurname }
onChange = { e => setManualSurname(e.target.value) }
onKeyDown = { e => e.key === 'Enter' && addManualGuest() }
placeholder = "Apellido"
className = "flex-1 min-w-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
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
onClick = { addManualGuest }
className = "px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
  >
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
  < button
onClick = {() => removeGuest(g.id)}
className = "text-red-400 hover:text-red-600 transition-colors p-1"
  >
  <svg xmlns="http://www.w3.org/2000/svg" className = "w-4 h-4" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" >
    <path d="M3 6h18" /> <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /> <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </svg>
      < /button>
      < /div>
          ))}
</div>
  < /div>
  < /div>
  );
}