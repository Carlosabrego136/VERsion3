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
  const [lastImportCount, setLastImportCount] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [g, t] = await Promise.all([getGuests(eventId), getTables(eventId)]);
    setGuests(g);
    setTables(t);
    onGuestsChanged();
  };

  useEffect(() => { refresh(); }, [eventId]);

  const parseLines = async (text: string, currentTables: TableData[]): Promise<GuestData[]> => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const result: GuestData[] = [];
    const tableMap = new Map<string, string>();
    currentTables.forEach(t => tableMap.set(t.label.toLowerCase().trim(), t.id));

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Skip header
      if (/^nombre[,;\t|]/i.test(trimmed)) continue;

      const parts = trimmed.split(/[,;\t|]/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) continue;

      const name = parts[0];
      const surname = parts[1];
      const tableLabel = parts[2] || '';

      if (name.toLowerCase() === 'nombre') continue;

      let tableId = '';
      if (tableLabel) {
        const key = tableLabel.toLowerCase().trim();
        if (tableMap.has(key)) {
          tableId = tableMap.get(key)!;
        } else {
          const newTable: TableData = {
            id: generateId(),
            eventId,
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

      result.push({ id: generateId(), eventId, name, surname, tableId });
    }
    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setLastImportCount(null);

    try {
      let text = '';

      if (file.name.toLowerCase().endsWith('.pdf')) {
        // Dynamically import pdfjs
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        const buffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buffer }).promise;

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();

          // Group by Y to reconstruct rows
          const rowMap = new Map<number, { x: number; str: string }[]>();
          for (const item of content.items) {
            const it = item as { str: string; transform: number[] };
            if (!it.str.trim()) continue;
            // Round Y to 3px buckets to group items on same visual line
            const y = Math.round(it.transform[5] / 3) * 3;
            if (!rowMap.has(y)) rowMap.set(y, []);
            rowMap.get(y)!.push({ x: it.transform[4], str: it.str.trim() });
          }

          // top→bottom (PDF Y is bottom-up so sort descending)
          const ys = Array.from(rowMap.keys()).sort((a, b) => b - a);
          for (const y of ys) {
            const cells = rowMap.get(y)!.sort((a, b) => a.x - b.x);
            const line = cells.map(c => c.str).join(',');
            if (line.trim()) text += line + '\n';
          }
        }
      } else if (file.name.toLowerCase().match(/\.docx?$/)) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else {
        // CSV / TXT
        text = await file.text();
      }

      const currentTables = await getTables(eventId);
      const parsed = await parseLines(text, currentTables);

      let added = 0;
      for (const g of parsed) {
        await addGuest(g);
        added++;
      }

      setLastImportCount(added);
      await refresh();
    } catch (err) {
      console.error('Import error:', err);
      alert('Error al importar. Verifica que el archivo tenga el formato: Nombre, Apellido, Mesa');
    } finally {
      setImporting(false);
      // Reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const downloadTemplate = () => {
    const csv = 'Nombre,Apellido,Mesa\nJuan,Perez,1\nMaria,Garcia,2\nCarlos,Lopez,1';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_invitados.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className= "space-y-4" >

    {/* ── Import ── */ }
    < div className = "bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" > Importar Invitados < /h3>
        < p className = "text-xs text-gray-500" >
          Archivo CSV, Word o PDF con columnas: <strong>Nombre, Apellido, Mesa < /strong>
            < /p>

  {/* File button — native input, no JS open() call (works on mobile) */ }
  <div className="flex flex-wrap gap-2" >
    <label
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer select-none"
  style = {{ display: 'inline-block' }
}
          >
  { importing? 'Importando…': 'Cargar Archivo' }
  < input
ref = { fileInputRef }
type = "file"
accept = ".csv,.txt,.doc,.docx,.pdf"
onChange = { handleFileChange }
disabled = { importing }
style = {{ display: 'none' }}
/>
  < /label>

  < button
type = "button"
onClick = { downloadTemplate }
className = "px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
  >
  Descargar Plantilla
    < /button>
    < /div>

{
  lastImportCount !== null && (
    <p className="text-sm font-medium text-green-600" >✅ { lastImportCount } invitados importados < /p>
        )
}
</div>

{/* ── Manual ── */ }
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
  <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" > Agregar Manualmente < /h3>

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
  tables.map(t => <option key={ t.id } value = { t.id } > { t.label } < /option>)}
    < /select>
    < button
            type = "button"
            onClick = { handleAddManual }
            className = "px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors"
    >
    Agregar
    < /button>
    < /div>
    < /div>

      {/* ── List ── */ }
    < div className = "bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3" >
    <div className="flex items-center justify-between gap-2" >
  <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide" >
  Lista({ guests.length })
  < /h3>
  < input
            type = "text"
            value = { searchTerm }
            onChange = { e => setSearchTerm(e.target.value)
}
placeholder = "Buscar…"
className = "px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-36"
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
  <span className="text-sm font-medium text-gray-800 truncate" > { g.name } { g.surname } < /span>
  < span className = "ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap" >
  { getTableName(g.tableId)
}
</span>
  < /div>
  < button
type = "button"
onClick = {() => handleDelete(g.id)}
className = "shrink-0 text-red-400 hover:text-red-600 transition-colors p-1"
aria - label="Eliminar"
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