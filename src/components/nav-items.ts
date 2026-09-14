import { FileText, LayoutGrid, Package, Receipt, Settings, Users } from 'lucide-react';

export const navItems = [
  { href: '/', label: 'Home', icon: LayoutGrid },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
];
