import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FiCheckSquare, FiSquare } from 'react-icons/fi';
import { Dialog } from '@headlessui/react';


interface Cliente {
  id: string;
  nombre: string;
  identification_number?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  clientes: Cliente[];
  nombreNegocio: string;
  emailNegocio: string;
  onEditCliente: (cliente: Cliente) => void;
  clientesPreseleccionados?: string[];
}

export default function ValidarClienteModal({ open, onClose, clientes, nombreNegocio, emailNegocio, onEditCliente, clientesPreseleccionados = [] }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Cliente[]>([]);
  const [titulo, setTitulo] = useState('Saludos, necesito validar status de asegurados.');
  const [descripcion, setDescripcion] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [showSinId, setShowSinId] = useState(false);
  const [sinId, setSinId] = useState<Cliente[]>([]);
  const [modoIndividual, setModoIndividual] = useState(false);

  // Preselección tras edición
  useEffect(() => {
    if (clientesPreseleccionados.length > 0) {
      const seleccion = clientes.filter(c => 
        clientesPreseleccionados.includes(c.id) && 
        c.identification_number && 
        c.identification_number.trim() !== ''
      );
      setSeleccionados(seleccion);
      // Si hay clientes sin ID, los mostramos en el modal de alerta
      const sinIdNuevos = clientes.filter(c => 
        clientesPreseleccionados.includes(c.id) && 
        (!c.identification_number || c.identification_number.trim() === '')
      );
      if (sinIdNuevos.length > 0) {
        setSinId(sinIdNuevos);
        setShowSinId(true);
        setModoIndividual(sinIdNuevos.length === 1);
      }
    }
  }, [clientesPreseleccionados, clientes]);

  // Filtrado dinámico de clientes (mostrar todos, sin id primero)
  const clientesFiltrados = [
    ...clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) && (!c.identification_number || c.identification_number.trim() === '')),
    ...clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) && c.identification_number && c.identification_number.trim() !== '')
  ];

  // Seleccionar todos los clientes con identificación
  const handleSeleccionarTodos = () => {
    const todos = clientesFiltrados.filter(c => !seleccionados.some(s => s.id === c.id));
    const sinIdNuevos = todos.filter(c => !c.identification_number || c.identification_number.trim() === '');
    if (sinIdNuevos.length > 0) {
      setSinId(sinIdNuevos);
      setShowSinId(true);
      setModoIndividual(false);
    }
    setSeleccionados([
      ...seleccionados,
      ...todos.filter(c => c.identification_number && c.identification_number.trim() !== '')
    ]);
  };

  // Quitar todos los seleccionados
  const handleQuitarTodos = () => {
    setSeleccionados([]);
  };

  // Seleccionar un cliente
  const handleSeleccionarCliente = (cliente: Cliente) => {
    if (seleccionados.some(c => c.id === cliente.id)) return;
    if (!cliente.identification_number || cliente.identification_number.trim() === '') {
      setSinId([cliente]);
      setShowSinId(true);
      setModoIndividual(true);
      return;
    }
    setSeleccionados([...seleccionados, cliente]);
  };

  // Quitar un cliente de la selección
  const handleQuitarCliente = (id: string) => {
    setSeleccionados(seleccionados.filter(c => c.id !== id));
  };

  // Quitar un cliente de la lista de sin identificación
  const handleQuitarSinId = (id: string) => {
    setSinId(sinId.filter(c => c.id !== id));
  };

  // Editar un cliente sin identificación
  const handleEditarSinId = (cliente: Cliente) => {
    onEditCliente(cliente);
    setShowSinId(false); // Cerramos el modal de alerta mientras se edita
  };

  // Cuando se edita un cliente, si ya tiene identificación, añadirlo a seleccionados y quitarlo de sinId
  useEffect(() => {
    if (sinId.length > 0) {
      const actualizados = sinId.filter(c => c.identification_number && c.identification_number.trim() !== '');
      if (actualizados.length > 0) {
        setSeleccionados(prev => [...prev, ...actualizados]);
        setSinId(prev => prev.filter(c => !actualizados.some(a => a.id === c.id)));
        // Si quedan clientes sin ID, volvemos a mostrar el modal de alerta
        if (sinId.filter(c => !actualizados.some(a => a.id === c.id)).length > 0) {
          setShowSinId(true);
        }
      }
    }
  }, [clientes]);

  // Checkbox visual para "Todos"
  const todosSeleccionados = seleccionados.length === clientesFiltrados.filter(c => c.identification_number && c.identification_number.trim() !== '').length;

  // Actualizar descripción automáticamente
  useEffect(() => {
    let desc = 'Saludos,\nNecesito validar status de los siguientes asegurados:';
    if (seleccionados.length > 0) {
      desc += '\n\n';
      desc += seleccionados.map(c => `${c.nombre} - ${c.identification_number}`).join('\n');
    }
    desc += `\n\n${nombreNegocio}`;
    setDescripcion(desc);
  }, [seleccionados, nombreNegocio]);

  // Enviar email usando mailto
  const handleEnviarEmail = () => {
    if (!destinatario || seleccionados.length === 0) return;
    const mailto = `mailto:${destinatario}?cc=${encodeURIComponent(emailNegocio)}&subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(descripcion)}`;
    window.location.href = mailto;
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[100]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-xl bg-white p-0 shadow-lg relative flex flex-col max-h-[90vh]">
          <form className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
              <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
                Validar Cliente
              </h2>
              {/* Label e input de búsqueda */}
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                  <div className="flex items-center select-none cursor-pointer ml-2" onClick={todosSeleccionados ? handleQuitarTodos : handleSeleccionarTodos}>
                    <span className="text-sm font-medium mr-1">Todos</span>
                    {todosSeleccionados ? (
                      <FiCheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <FiSquare className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              {/* Lista de clientes para seleccionar en un frame visual */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-inner mb-4 max-h-40 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
                <ul className="divide-y">
                  {/* Clientes sin identificación primero (no seleccionados) */}
                  {clientesFiltrados.filter(c => (!c.identification_number || c.identification_number.trim() === '') && !seleccionados.some(s => s.id === c.id)).map(cliente => (
                    <li
                      key={cliente.id}
                      className="py-2 px-2 flex items-center gap-2 hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleSeleccionarCliente(cliente)}
                    >
                      <span>{cliente.nombre}</span>
                      <span className="ml-2 text-xs text-red-500 font-semibold">Sin identificación</span>
                    </li>
                  ))}
                  {/* Clientes con identificación pero no seleccionados */}
                  {clientesFiltrados.filter(c => c.identification_number && c.identification_number.trim() !== '' && !seleccionados.some(s => s.id === c.id)).map(cliente => (
                    <li
                      key={cliente.id}
                      className="py-2 px-2 flex items-center gap-2 hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleSeleccionarCliente(cliente)}
                    >
                      <span>{cliente.nombre} - {cliente.identification_number}</span>
                    </li>
                  ))}
                  {/* Clientes seleccionados con identificación */}
                  {clientesFiltrados.filter(c => seleccionados.some(s => s.id === c.id)).map(cliente => (
                    <li
                      key={cliente.id}
                      className="py-2 px-2 flex items-center gap-2 bg-blue-100/70 cursor-pointer"
                      onClick={() => handleQuitarCliente(cliente.id)}
                    >
                      <span className="font-semibold">{cliente.nombre} - {cliente.identification_number}</span>
                      <span className="ml-auto text-xs text-blue-600">Seleccionado</span>
                    </li>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <li className="py-2 px-2 text-gray-400">No hay clientes</li>
                  )}
                </ul>
              </div>

              {/* Chips de seleccionados */}
              {seleccionados.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 mt-2 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">Asegurados seleccionados</span>
                    <button
                      onClick={handleQuitarTodos}
                      className="px-3 py-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 text-xs font-semibold shadow-sm transition-colors"
                    >
                      Quitar todos
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto pr-1">
                    {seleccionados.map(cliente => (
                      <div key={cliente.id} className="flex items-center bg-blue-100/70 text-blue-800 rounded-full px-3 py-1 text-xs font-medium">
                        <span className="mr-2">{cliente.nombre} - {cliente.identification_number}</span>
                        <button onClick={() => handleQuitarCliente(cliente.id)} className="ml-1 text-blue-500 hover:text-blue-700">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal/alerta para clientes sin identificación */}
              {showSinId && sinId.length > 0 && (
                <div className="fixed inset-0 flex items-center justify-center z-[101] bg-black/30">
                  <div className="bg-white rounded-xl p-6 shadow-lg max-w-xs w-full relative">
                    <h3 className={`text-center font-semibold mb-3 ${modoIndividual ? 'text-orange-600' : 'text-red-600'}`}>{modoIndividual ? 'Cliente sin identificación' : 'Clientes sin identificación'}</h3>
                    <ul className="mb-4">
                      {sinId.map(cliente => (
                        <li key={cliente.id} className="flex items-center justify-between mb-2">
                          <span>{cliente.nombre}</span>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleEditarSinId(cliente)}
                              className="text-blue-600 hover:underline text-xs px-2 py-1 rounded border border-blue-100 bg-blue-50"
                            >
                              Añadir identificación
                            </button>
                            <button
                              onClick={() => handleQuitarSinId(cliente.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setShowSinId(false)}
                      className="w-full py-2 rounded bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}

              {/* Input de destinatario manual */}
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Destinatario (email)</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={destinatario}
                  onChange={e => setDestinatario(e.target.value)}
                  placeholder="Escribe el email de validaciones"
                />
                <div className="text-xs text-gray-500 mt-1">CC: {emailNegocio}</div>
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Título del email"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  rows={6}
                  placeholder="Mensaje del email"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-white flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarEmail}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                disabled={!destinatario || !titulo || !descripcion || seleccionados.length === 0}
              >
                Enviar email
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 