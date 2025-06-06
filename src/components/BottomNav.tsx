import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiUsers, FiDollarSign, FiSettings, FiCalendar } from 'react-icons/fi';

const navItems = [
  { to: '/home', icon: <FiHome />, label: 'Inicio' },
  { to: '/clientes', icon: <FiUsers />, label: 'Clientes' },
  { to: '/agenda', icon: <FiCalendar />, label: 'Agenda' },
  { to: '/ventas', icon: <FiDollarSign />, label: 'Ventas' },
  { to: '/configuracion', icon: <FiSettings />, label: 'Info' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t shadow-lg flex justify-around items-center h-16 z-50 md:static md:h-auto md:shadow-none md:border-none md:bg-transparent">
      {navItems.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className={`flex flex-col items-center justify-center text-xs font-medium transition-colors relative ${location.pathname === item.to ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-300'}`}
        >
          <span className="text-xl mb-1">{item.icon}</span>
          {item.label}
          {location.pathname === item.to && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white dark:bg-blue-500" />
          )}
        </Link>
      ))}
    </nav>
  );
} 