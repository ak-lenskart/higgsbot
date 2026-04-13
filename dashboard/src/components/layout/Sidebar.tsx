import { NavLink } from 'react-router-dom';
import { ExtensionStatusBadge } from './ExtensionStatusBadge';

const NAV_ITEMS = [
  { to: '/upload', label: 'Upload' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/prompts', label: 'Prompts' },
  { to: '/queue', label: 'Queue' },
  { to: '/review', label: 'Review' },
  { to: '/characters', label: 'Characters' },
  { to: '/scenes', label: 'Scenes' },
  { to: '/settings', label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-border flex flex-col h-screen shrink-0">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-gray-900">HiggsBot</h1>
        <p className="text-xs text-muted mt-0.5">AI Image Pipeline</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-primary'
                  : 'text-gray-600 hover:bg-surface-hover hover:text-gray-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <ExtensionStatusBadge />
      </div>
    </aside>
  );
}
