import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Venta, Cliente } from '../types';

interface VentaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  venta: Venta | null;
  clientes: Cliente[];
  preselectedClienteId?: string | null;
}

export default function VentaModal({ open, onClose, onCreated, venta, clientes, preselectedClienteId }: VentaModalProps) {
  const [form, setForm] = useState({
    cliente_id: '',
    monto: '',
    tipo: '',
    fecha: new Date().toISOString().split('T')[0]
  });
  const [date, setDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [errores, setErrores] = useState<{ [key: string]: string }>({});
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);

  useEffect(() => {
    if (venta) {
      setForm({
        cliente_id: venta.cliente_id || '',
        monto: venta.monto ? String(venta.monto) : '',
        tipo: venta.tipo || '',
        fecha: venta.fecha || new Date().toISOString().split('T')[0]
      });
      setDate(venta.fecha ? new Date(venta.fecha) : null);
    } else if (preselectedClienteId) {
      setForm({
        cliente_id: preselectedClienteId,
        monto: '',
        tipo: '',
        fecha: new Date().toISOString().split('T')[0]
      });
      setDate(null);
    } else {
      setForm({
        cliente_id: '',
        monto: '',
        tipo: '',
        fecha: new Date().toISOString().split('T')[0]
      });
      setDate(null);
    }
    setErrores({});
  }, [venta, open, preselectedClienteId]);

  useEffect(() => {
    if (!open) {
      setShowDropdown(false);
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    if (!showTipoDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.tipo-dropdown')) {
        setShowTipoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTipoDropdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'monto') {
      // Solo permitir números y máximo dos decimales
      const clean = value.replace(/[^\d.]/g, '');
      setForm({ ...form, [name]: clean });
    } else {
      setForm({ ...form, [name]: value });
    }
    setErrores({ ...errores, [name]: '' });
  };

  const handleDateChange = (date: Date | null) => {
    setDate(date);
    setForm({ ...form, fecha: date ? date.toISOString().split('T')[0] : '' });
  };

  const handleMontoBlur = () => {
    // Formatear a dos decimales al salir del input
    if (form.monto) {
      setForm({ ...form, monto: Number(form.monto).toFixed(2) });
    }
  };

  const validarFormulario = () => {
    const nuevosErrores: { [key: string]: string } = {};
    if (!form.cliente_id) nuevosErrores.cliente_id = 'Selecciona un cliente.';
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) nuevosErrores.monto = 'Ingresa un monto válido mayor a 0.';
    if (!form.tipo) nuevosErrores.tipo = 'Selecciona el tipo de venta.';
    if (!form.fecha) nuevosErrores.fecha = 'Selecciona una fecha válida.';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validarFormulario()) {
      toast.error('Corrige los errores antes de guardar');
      return;
    }
    setLoading(true);
    try {
      const data = {
        ...form,
        monto: Number(form.monto),
      };
      if (venta && venta.id) {
        await api.put(`/api/ventas/${venta.id}`, data);
      } else {
        await api.post('/api/ventas', data);
      }
      toast.success('Venta guardada');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar venta');
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter((c: Cliente) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleClienteSelect = (cliente: Cliente) => {
    setForm({ ...form, cliente_id: cliente.id });
    setShowDropdown(false);
    setSearch('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-4 w-full max-w-xs mx-2">
        <h2 className="text-xl font-bold mb-4 text-center">{venta ? 'Editar venta' : 'Nueva venta'}</h2>
        <div className="mb-3 relative">
          <label className="block mb-1 font-semibold">Selecciona un cliente</label>
          <div
            className="w-full px-3 py-2 border rounded focus:outline-none bg-white cursor-pointer"
            onClick={() => {
              setShowDropdown(!showDropdown);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          >
            {form.cliente_id
              ? clientes.find((c) => c.id === form.cliente_id)?.nombre || 'Selecciona un cliente'
              : 'Selecciona un cliente'}
          </div>
          {showDropdown && (
            <div className="absolute left-0 right-0 bg-white border rounded shadow-lg mt-1 z-10 max-h-48 overflow-auto">
              <input
                ref={inputRef}
                type="text"
                className="w-full px-3 py-2 border-b focus:outline-none"
                placeholder="Buscar cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
              {clientesFiltrados.length === 0 ? (
                <div className="px-3 py-2 text-gray-500">No hay clientes</div>
              ) : (
                clientesFiltrados.map((c) => (
                  <div
                    key={c.id}
                    className={`px-3 py-2 hover:bg-blue-100 cursor-pointer ${form.cliente_id === c.id ? 'bg-blue-50 font-semibold' : ''}`}
                    onClick={() => handleClienteSelect(c)}
                  >
                    {c.nombre}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {errores.cliente_id && <div className="text-xs text-red-600 mb-2">{errores.cliente_id}</div>}
        
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Monto</label>
          
          <input
            name="monto"
            type="text"
            placeholder="Ej: 1000.00"
            className={`w-full mb-1 px-3 py-2 border rounded focus:outline-none ${errores.monto ? 'border-red-500' : ''}`}
            value={form.monto}
            onChange={e => handleChange(e)}
            onBlur={handleMontoBlur}
            onFocus={() => setForm({ ...form, monto: form.monto.replace(/[^\d.]/g, '') })}
            required
          />
          {errores.monto && <div className="text-xs text-red-600 mb-2">{errores.monto}</div>}
        </div>

        <div className="mb-4 relative tipo-dropdown">
          <label className="block mb-1 font-semibold">Tipo de venta</label>
          <div className="relative tipo-dropdown">
            <button
              type="button"
              className={`w-full px-3 py-2 border rounded bg-white text-gray-900 text-base font-medium shadow-sm flex justify-between items-center transition focus:outline-none ${errores.tipo ? 'border-red-500' : ''} tipo-dropdown`}
              onClick={() => setShowTipoDropdown(v => !v)}
              aria-haspopup="listbox"
              aria-expanded={showTipoDropdown}
            >
              {form.tipo === '' ? 'Selecciona el tipo de venta' : form.tipo === 'venta' ? 'Venta única' : 'Mensualidad'}
              <svg className={`w-5 h-5 ml-2 transition-transform ${showTipoDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showTipoDropdown && (
              <ul className="tipo-dropdown absolute left-0 right-0 bg-white border rounded shadow-lg mt-1 z-20 max-h-40 overflow-auto animate-fade-in" role="listbox">
                <li
                  className={`px-4 py-2 cursor-pointer hover:bg-blue-100 transition-colors rounded ${form.tipo === 'venta' ? 'bg-blue-100 font-semibold text-blue-800' : ''}`}
                  onClick={() => { setForm({ ...form, tipo: 'venta' }); setShowTipoDropdown(false); setErrores({ ...errores, tipo: '' }); }}
                  role="option"
                  aria-selected={form.tipo === 'venta'}
                >
                  Venta única
                </li>
                <li
                  className={`px-4 py-2 cursor-pointer hover:bg-blue-100 transition-colors rounded ${form.tipo === 'mensual' ? 'bg-blue-100 font-semibold text-blue-800' : ''}`}
                  onClick={() => { setForm({ ...form, tipo: 'mensual' }); setShowTipoDropdown(false); setErrores({ ...errores, tipo: '' }); }}
                  role="option"
                  aria-selected={form.tipo === 'mensual'}
                >
                  Mensualidad
                </li>
              </ul>
            )}
          </div>
          {errores.tipo && <div className="text-xs text-red-600 mt-1">{errores.tipo}</div>}
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-semibold">Fecha de venta</label>
         
          <DatePicker
            selected={date}
            onChange={handleDateChange}
            dateFormat="yyyy-MM-dd"
            placeholderText="Fecha"
            className="w-full mb-4 px-3 py-2 border rounded focus:outline-none"
            maxDate={new Date()}
            isClearable
          />
          {errores.fecha && <div className="text-xs text-red-600 mb-2">{errores.fecha}</div>}
        </div>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            className="flex-1 py-2 rounded bg-gray-200 text-gray-700 font-semibold"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
} 