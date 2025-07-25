import { useEffect, useState } from 'react';
import api from '../services/api';
import VentaModal from '../components/VentaModal';
import { FiSearch, FiCalendar, FiX } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Venta, Cliente } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { showDeleteConfirmation, showSuccessMessage } from '../utils/alerts';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useDarkMode } from '../contexts/AuthContext';
import { useOutletContext } from 'react-router-dom';
import BotonCrear from '../components/BotonCrear';
import React from 'react';
import type { LegacyRef, ForwardRefRenderFunction } from 'react';

export default function Ventas() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState<Date | null>(null);
  const [hasta, setHasta] = useState<Date | null>(null);
  const [tipo, setTipo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [ventaEditando, setVentaEditando] = useState<Venta | null>(null);
  const [preselectedClienteId, setPreselectedClienteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { dark } = useDarkMode();
  const outletContext = useOutletContext() as { color_personalizado?: string } | null;
  const color_personalizado = outletContext?.color_personalizado || '#2563eb';
  console.log('color_personalizado VENTAS', color_personalizado);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    fetchVentas();
    fetchClientes();
    // Si viene de una tarea para venta, abrir modal con cliente preseleccionado
    const clienteId = localStorage.getItem('venta_cliente_id');
    if (clienteId) {
      setPreselectedClienteId(clienteId);
      setShowModal(true);
      localStorage.removeItem('venta_cliente_id');
    }
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    // eslint-disable-next-line
  }, []);

  const fetchVentas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/ventas', { params: { page: 1, limit: 1000 } });
      console.log('Respuesta API ventas:', res.data);
      setVentas(res.data || []);
    } catch {
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await api.get('/api/clientes');
      setClientes(res.data);
    } catch {
      setClientes([]);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await showDeleteConfirmation('¿Seguro que deseas eliminar esta venta?');
    if (result.isConfirmed) {
      try {
        await api.delete(`/api/ventas/${id}`);
        showSuccessMessage('Venta eliminada con éxito');
        setVentas(ventas.filter(venta => venta.id !== id));
      } catch (error) {
        console.error('Error al eliminar la venta:', error);
      }
    }
  };

  // Función para comparar solo fechas (sin hora)
  function isSameOrAfter(date1: Date, date2: Date) {
    return date1.setHours(0,0,0,0) >= date2.setHours(0,0,0,0);
  }
  function isSameOrBefore(date1: Date, date2: Date) {
    return date1.setHours(0,0,0,0) <= date2.setHours(0,0,0,0);
  }

  // Filtro por nombre de cliente, tipo y fechas
  const ventasFiltradas = ventas.filter((v: Venta) => {
    const cliente = clientes.find(c => c.id === v.cliente_id);
    if (busqueda.trim()) {
      if (!cliente) return false;
      const primerNombre = cliente.nombre.trim().split(' ')[0].toLowerCase();
      if (!primerNombre.startsWith(busqueda.trim().toLowerCase())) return false;
    }
    if (tipo && v.tipo !== tipo) return false;
    if (desde && !isSameOrAfter(new Date(v.fecha), desde)) return false;
    if (hasta && !isSameOrBefore(new Date(v.fecha), hasta)) return false;
    return true;
  }).sort((a: Venta, b: Venta) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Totales globales (no filtrados)
  const totalMensual = ventas.filter((v: Venta) => v.tipo === 'mensual').reduce((acc, v) => acc + parseFloat(v.monto), 0);
  const totalVenta = ventas.filter((v: Venta) => v.tipo === 'venta').reduce((acc, v) => acc + parseFloat(v.monto), 0);

  // Totales filtrados (para mostrar si hay filtro de tipo)
  const totalMensualFiltrado = ventasFiltradas.filter((v: Venta) => v.tipo === 'mensual').reduce((acc, v) => acc + parseFloat(v.monto), 0);
  const totalVentaFiltrado = ventasFiltradas.filter((v: Venta) => v.tipo === 'venta').reduce((acc, v) => acc + parseFloat(v.monto), 0);

  // Exportar a PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(16);
    doc.text('Historial de ventas', 14, y);
    y += 8;
    if (desde) {
      doc.setFontSize(10);
      doc.text(`Desde: ${format(desde, 'yyyy-MM-dd')}`, 14, y);
      y += 6;
    }
    if (hasta) {
      doc.setFontSize(10);
      doc.text(`Hasta: ${format(hasta, 'yyyy-MM-dd')}`, 14, y);
      y += 6;
    }
    doc.setFontSize(10);
    doc.text(`Filtro: ${tipo === '' ? 'Ambos' : tipo === 'mensual' ? 'Mensual' : 'Venta'}`, 14, y);
    y += 8;
    doc.text(`Cantidad de registros: ${ventasFiltradas.length}`, 14, y);
    y += 6;
    let totalMensual = ventasFiltradas.filter(v => v.tipo === 'mensual').reduce((acc, v) => acc + parseFloat(v.monto), 0);
    let totalVenta = ventasFiltradas.filter(v => v.tipo === 'venta').reduce((acc, v) => acc + parseFloat(v.monto), 0);
    let resumen = '';
    if (tipo === '' || tipo === undefined) {
      resumen = `Total mensualidades: $${totalMensual.toFixed(2)}\nTotal ventas únicas: $${totalVenta.toFixed(2)}`;
    } else if (tipo === 'mensual') {
      resumen = `Total mensualidades: $${totalMensual.toFixed(2)}`;
    } else if (tipo === 'venta') {
      resumen = `Total ventas únicas: $${totalVenta.toFixed(2)}`;
    }
    autoTable(doc, {
      startY: y,
      head: [['Cliente', 'Monto', 'Fecha', 'Tipo']],
      body: ventasFiltradas.map(v => {
        const cliente = clientes.find(c => c.id === v.cliente_id);
        return [
          cliente?.nombre || 'Cliente',
          `$${parseFloat(v.monto).toFixed(2)}`,
          format(new Date(v.fecha), 'yyyy-MM-dd'),
          v.tipo === 'mensual' ? 'Mensualidad' : 'Venta única',
        ];
      }),
      didDrawPage: (data: any) => {
        doc.text(resumen, 14, data.cursor.y + 10);
      }
    });
    doc.save('historial_ventas.pdf');
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const wsData = [
      ['Historial de ventas'],
      [],
    ];
    if (desde) wsData.push([`Desde: ${format(desde, 'yyyy-MM-dd')}`]);
    if (hasta) wsData.push([`Hasta: ${format(hasta, 'yyyy-MM-dd')}`]);
    wsData.push([`Filtro: ${tipo === '' ? 'Ambos' : tipo === 'mensual' ? 'Mensual' : 'Venta'}`]);
    wsData.push([`Cantidad de registros: ${ventasFiltradas.length}`]);
    wsData.push([]);
    wsData.push(['Cliente', 'Monto', 'Fecha', 'Tipo']);
    ventasFiltradas.forEach(v => {
      const cliente = clientes.find(c => c.id === v.cliente_id);
      wsData.push([
        cliente?.nombre || 'Cliente',
        `$${parseFloat(v.monto).toFixed(2)}`,
        format(new Date(v.fecha), 'yyyy-MM-dd'),
        v.tipo === 'mensual' ? 'Mensualidad' : 'Venta única',
      ]);
    });
    let totalMensual = ventasFiltradas.filter(v => v.tipo === 'mensual').reduce((acc, v) => acc + parseFloat(v.monto), 0);
    let totalVenta = ventasFiltradas.filter(v => v.tipo === 'venta').reduce((acc, v) => acc + parseFloat(v.monto), 0);
    if (tipo === '' || tipo === undefined) {
      wsData.push([]);
      wsData.push([`Total mensualidades: $${totalMensual.toFixed(2)}`]);
      wsData.push([`Total ventas únicas: $${totalVenta.toFixed(2)}`]);
    } else if (tipo === 'mensual') {
      wsData.push([]);
      wsData.push([`Total mensualidades: $${totalMensual.toFixed(2)}`]);
    } else if (tipo === 'venta') {
      wsData.push([]);
      wsData.push([`Total ventas únicas: $${totalVenta.toFixed(2)}`]);
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'historial_ventas.xlsx');
  };

  // Componente input personalizado para DatePicker
  interface DateInputWithIconProps {
    value?: string;
    onClick?: () => void;
    placeholder?: string;
    onClear?: () => void;
    hasValue?: boolean;
    color_personalizado?: string;
  }
  const DateInputWithIcon: ForwardRefRenderFunction<HTMLInputElement, DateInputWithIconProps> = (
    { value, onClick, placeholder, onClear, hasValue, color_personalizado, ...props }, ref
  ) => (
    <div className="flex-1 min-w-[70px] max-w-[120px] md:min-w-[140px] md:max-w-[220px] flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold shadow-sm transition-all overflow-hidden bg-white border-blue-400 text-blue-700 relative">
      <span className="text-gray-300 flex-shrink-0">
        <FiCalendar size={18} />
      </span>
      <input
        ref={ref as LegacyRef<HTMLInputElement>}
        readOnly
        value={value || ''}
        onClick={onClick}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none border-none text-xs font-semibold placeholder-gray-400 px-0 min-w-0 truncate"
        style={{ minHeight: '24px' }}
        {...props}
      />
      {hasValue && (
        <button
          type="button"
          className="ml-2 text-gray-300 hover:text-red-500 focus:outline-none"
          onClick={onClear}
          tabIndex={-1}
          title="Limpiar fecha"
          style={{ zIndex: 2 }}
        >
          <FiX size={14} />
        </button>
      )}
    </div>
  );
  const DateInputWithIconForward = React.forwardRef(DateInputWithIcon);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:items-center md:justify-center md:max-w-3xl md:mx-auto md:px-8 md:pl-28">
      {/* Wave decoration */}
      <div className="absolute inset-x-0 top-0 -z-10">
        <svg className="w-full h-48" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path
            fill="url(#wave-gradient)"
            d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,218.7C672,203,768,149,864,128C960,107,1056,117,1152,128C1248,139,1344,149,1392,154.7L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
          />
        </svg>
      </div>

      <div className="relative flex-1 flex flex-col px-4 pb-24">
        <div className="text-center mb-8 mt-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Ventas</h1>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ background: color_personalizado }}></div>
        </div>
        {/* Botón Filtro y panel de filtros */}
        <div className="flex flex-col gap-4 mb-6">
          <button
            className="w-full md:w-auto px-4 py-2 rounded-xl font-semibold shadow bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 transition-all duration-150 mb-2 md:mb-0"
            style={{ borderColor: color_personalizado, color: color_personalizado }}
            onClick={() => setMostrarFiltros(v => !v)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0013 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 017 17v-3.586a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z" /></svg>
            Filtro
          </button>
          {(mostrarFiltros || window.innerWidth >= 768) && (
            <>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente..."
                  className="w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>
              <div className="flex flex-row flex-wrap gap-3 w-full mb-2 px-4">
                <DatePicker
                  selected={desde}
                  onChange={(date: Date | null) => setDesde(date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Desde"
                  customInput={
                    <DateInputWithIconForward
                      placeholder="Desde"
                      onClear={() => setDesde(null)}
                      hasValue={!!desde}
                      color_personalizado={color_personalizado}
                    />
                  }
                  maxDate={hasta || undefined}
                  isClearable
                  title="Filtra las ventas desde esta fecha"
                />
                <DatePicker
                  selected={hasta}
                  onChange={(date: Date | null) => setHasta(date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Hasta"
                  customInput={
                    <DateInputWithIconForward
                      placeholder="Hasta"
                      onClear={() => setHasta(null)}
                      hasValue={!!hasta}
                      color_personalizado={color_personalizado}
                    />
                  }
                  minDate={desde || undefined}
                  isClearable
                  title="Filtra las ventas hasta esta fecha"
                />
              </div>
              <div className="flex flex-row flex-wrap gap-3 w-full mb-2 px-4 justify-center">
                <button
                  className={`flex-1 min-w-[90px] max-w-[160px] md:min-w-[140px] md:max-w-[220px] flex items-center justify-center gap-1 px-2 py-2 rounded-xl border-2 font-semibold shadow-sm transition-all overflow-hidden text-xs md:text-sm
                    ${tipo === 'mensual' ? 'bg-blue-100/80 border-blue-600 text-blue-900' : 'bg-white border-blue-400 text-blue-700'}
                  `}
                  onClick={() => setTipo(tipo === 'mensual' ? '' : 'mensual')}
                >
                  <span className="text-base flex-shrink-0">💵</span>
                  <span className="flex-shrink-0">Mensual</span>
                  <span className="ml-1 font-bold text-blue-800 break-words text-xs md:text-sm whitespace-normal">${(tipo === 'mensual' ? totalMensualFiltrado : totalMensual).toFixed(2)}</span>
                </button>
                <button
                  className={`flex-1 min-w-[90px] max-w-[160px] md:min-w-[140px] md:max-w-[220px] flex items-center justify-center gap-1 px-2 py-2 rounded-xl border-2 font-semibold shadow-sm transition-all overflow-hidden text-xs md:text-sm
                    ${tipo === 'venta' ? 'bg-blue-100/80 border-blue-600 text-blue-900' : 'bg-white border-green-400 text-green-700'}
                  `}
                  onClick={() => setTipo(tipo === 'venta' ? '' : 'venta')}
                >
                  <span className="text-base flex-shrink-0">🪙</span>
                  <span className="flex-shrink-0">Venta</span>
                  <span className="ml-1 font-bold text-green-800 break-words text-xs md:text-sm whitespace-normal">${(tipo === 'venta' ? totalVentaFiltrado : totalVenta).toFixed(2)}</span>
                </button>
              </div>
              <div className="flex justify-center mb-2">
                <button
                  className={`flex items-center justify-center gap-2 px-5 py-2 rounded-full border-2 font-semibold shadow-sm transition-all
                    ${tipo === '' ? 'bg-blue-100/80 border-blue-600 text-blue-900' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}
                  `}
                  style={{ minWidth: 120 }}
                  onClick={() => setTipo('')}
                >
                  <span className="text-lg">📋</span>
                  <span>Ambos</span>
                </button>
              </div>
            </>
          )}
        </div>

        {tipo && tipo !== '' && (
          <div className="flex items-center justify-between mb-4">
            <div className="text-center text-sm font-medium px-4 py-2 bg-gray-50 rounded-xl">
              Total {tipo === 'mensual' ? 'mensualidades' : 'ventas únicas'}: 
              <span className="text-blue-700 ml-2 font-semibold">${(tipo === 'mensual' ? totalMensualFiltrado : totalVentaFiltrado).toFixed(2)}</span>
            </div>
            <div className="flex gap-2 ml-2">
              <button
                onClick={exportarPDF}
                className="px-3 py-2 rounded-lg bg-white border border-blue-400 text-blue-700 font-semibold shadow-sm hover:bg-blue-50 transition"
                title="Exportar a PDF"
                type="button"
              >
                PDF
              </button>
              <button
                onClick={exportarExcel}
                className="px-3 py-2 rounded-lg bg-white border border-green-400 text-green-700 font-semibold shadow-sm hover:bg-green-50 transition"
                title="Exportar a Excel"
                type="button"
              >
                Excel
              </button>
            </div>
          </div>
        )}

        {/* Si no hay filtro, igual mostrar los botones debajo del total global */}
        {(!tipo || tipo === '') && (
          <div className="flex justify-end mb-4">
            <div className="flex gap-2">
              <button
                onClick={exportarPDF}
                className="px-3 py-2 rounded-lg bg-white border border-blue-400 text-blue-700 font-semibold shadow-sm hover:bg-blue-50 transition"
                title="Exportar a PDF"
                type="button"
              >
                PDF
              </button>
              <button
                onClick={exportarExcel}
                className="px-3 py-2 rounded-lg bg-white border border-green-400 text-green-700 font-semibold shadow-sm hover:bg-green-50 transition"
                title="Exportar a Excel"
                type="button"
              >
                Excel
              </button>
            </div>
          </div>
        )}

        {/* Botón crear venta arriba de la lista */}
        <div className="flex justify-start mb-4 hidden md:flex">
          <BotonCrear
            onClick={() => { setVentaEditando(null); setShowModal(true); }}
            label="Nueva Venta"
            color_personalizado={color_personalizado}
            size="md"
            className=""
          />
        </div>
        {/* Botón flotante solo en móvil */}
        <div className="fixed top-1/2 -translate-y-1/2 right-6 z-50 md:hidden">
          <BotonCrear
            onClick={() => { setVentaEditando(null); setShowModal(true); }}
            label=""
            color_personalizado={color_personalizado}
            size="fab"
            className=""
          />
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay ventas.</div>
        ) : (
          <ul className="space-y-4">
            {ventasFiltradas.map((venta: Venta) => {
              const cliente = clientes.find(c => c.id === venta.cliente_id);
              return (
                <li key={venta.id} className="bg-white rounded-xl shadow-sm p-4 relative">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => { setVentaEditando(venta); setShowModal(true); }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(venta.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="pr-24">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {cliente?.nombre || 'Cliente no encontrado'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(venta.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-medium text-gray-900">${parseFloat(venta.monto).toFixed(2)}</span>
                      <span className={`inline-block text-xs px-3 py-1 rounded-full ${
                        venta.tipo === 'mensual' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                      }`}>
                        {venta.tipo === 'mensual' ? 'Mensual' : 'Venta única'}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <VentaModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onCreated={fetchVentas}
          venta={ventaEditando}
          clientes={clientes}
          preselectedClienteId={preselectedClienteId}
        />
      </div>
    </div>
  );
} 