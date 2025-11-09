import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const navItems = [
    { path: '/', name: 'Dashboard' },
    { path: '/inventory', name: 'Inventory' },
    { path: '/parts', name: 'Parts' },
    { path: '/inbound', name: 'Inbound' },
    { path: '/outbound', name: 'Outbound' },
    { path: '/suppliers', name: 'Suppliers' },
  ];

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="h-20 flex items-center justify-center text-2xl font-bold">CNC Inventory</div>
      <nav className="flex-1 px-4 py-8">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-md transition-colors duration-200 ${
                    isActive ? 'bg-gray-700' : 'hover:bg-gray-700'
                  }`
                }
              >
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
