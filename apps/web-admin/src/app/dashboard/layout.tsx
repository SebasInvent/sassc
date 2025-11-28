"use client";

import { useState } from 'react';
import { UserMenu } from '@/components/UserMenu';
import { NotificationsBell } from '@/components/dashboard/notifications-bell';
import { 
  Stethoscope, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Building2,
  ClipboardList,
  BarChart3,
  Shield,
  UserPlus,
  ScanFace,
  Hospital,
  ArrowRightLeft,
  Pill,
  FlaskConical,
  ImageIcon,
  DollarSign,
  Heart,
  Package,
  FileCheck,
  Activity,
  Scan,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Menú organizado por secciones
const menuSections = [
  {
    title: 'Principal',
    items: [
      { 
        title: 'Dashboard', 
        href: '/dashboard', 
        icon: LayoutDashboard,
        description: 'Vista general del sistema',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
    ]
  },
  {
    title: 'Reforma de Salud',
    badge: 'Nuevo',
    items: [
      { 
        title: 'CAPs', 
        href: '/dashboard/caps', 
        icon: Building2,
        description: 'Centros de Atención Primaria',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
      },
      { 
        title: 'IPS', 
        href: '/dashboard/ips', 
        icon: Hospital,
        description: 'Hospitales y Clínicas',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      { 
        title: 'Remisiones', 
        href: '/dashboard/remisiones', 
        icon: ArrowRightLeft,
        description: 'Sistema CAP → IPS',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
      },
      { 
        title: 'Modelo Preventivo', 
        href: '/dashboard/preventivo', 
        icon: Heart,
        description: 'Programas de prevención',
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
      },
      { 
        title: 'Financiero (ADRES)', 
        href: '/dashboard/financiero', 
        icon: DollarSign,
        description: 'Pagos directos a IPS',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      },
    ]
  },
  {
    title: 'Gestión Clínica',
    items: [
      { 
        title: 'Pacientes', 
        href: '/dashboard/patients', 
        icon: Users,
        description: 'Gestión territorializada',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      { 
        title: 'Citas', 
        href: '/dashboard/appointments', 
        icon: Calendar,
        description: 'Agenda médica',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      { 
        title: 'Autorizaciones', 
        href: '/dashboard/authorizations', 
        icon: FileCheck,
        description: 'Gestión de autorizaciones',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      },
    ]
  },
  {
    title: 'Servicios Diagnósticos',
    items: [
      { 
        title: 'Laboratorio', 
        href: '/dashboard/laboratory', 
        icon: FlaskConical,
        description: 'Órdenes y resultados',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
      },
      { 
        title: 'Imágenes Diagnósticas', 
        href: '/dashboard/imaging', 
        icon: Scan,
        description: 'Radiología y estudios',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
      },
    ]
  },
  {
    title: 'Farmacia e Inventario',
    items: [
      { 
        title: 'Farmacia', 
        href: '/dashboard/pharmacy', 
        icon: Pill,
        description: 'Dispensación de medicamentos',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      { 
        title: 'Inventario', 
        href: '/dashboard/inventory', 
        icon: Package,
        description: 'Control de stock',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
      },
    ]
  },
  {
    title: 'Administración',
    items: [
      { 
        title: 'Reportes', 
        href: '/dashboard/reportes', 
        icon: BarChart3,
        description: 'Analytics y métricas',
        color: 'text-violet-600',
        bgColor: 'bg-violet-50',
      },
      { 
        title: 'Usuarios y Roles', 
        href: '/dashboard/users', 
        icon: Shield,
        description: 'Gestión de accesos',
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
      },
      { 
        title: 'Auditoría', 
        href: '/dashboard/auditoria', 
        icon: Shield,
        description: 'Trazabilidad y firmas',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
      },
      { 
        title: 'Normativo', 
        href: '/dashboard/normativo', 
        icon: FileCheck,
        description: 'RIPS, MIPRES, Facturación',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
    ]
  },
];

const bottomMenuItems = [
  { 
    title: 'Configuración', 
    href: '/dashboard/settings', 
    icon: Settings,
    description: 'Ajustes del sistema'
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Sidebar - Diseño elegante y amplio */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-100 shadow-xl transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-72" : "w-20"
      )}>
        {/* Logo Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-cyan-600">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold text-white">SASSC</h1>
                <p className="text-[11px] text-blue-100">Software Anticorrupción Sistema Salud</p>
              </div>
            )}
          </Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Menu Sections - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {menuSections.map((section, sectionIdx) => (
            <div key={section.title} className={cn(sectionIdx > 0 && "mt-6")}>
              {/* Section Header */}
              {sidebarOpen && (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                  {section.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full">
                      {section.badge}
                    </span>
                  )}
                </div>
              )}
              
              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard';
                  const active = isActive || isExactDashboard;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                        active 
                          ? `${item.bgColor} shadow-sm` 
                          : "hover:bg-gray-50"
                      )}
                    >
                      {/* Active Indicator */}
                      {active && (
                        <div className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full",
                          item.color.replace('text-', 'bg-')
                        )} />
                      )}
                      
                      {/* Icon */}
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        active 
                          ? `${item.bgColor} ${item.color}` 
                          : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                      )}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      
                      {/* Text */}
                      {sidebarOpen && (
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            active ? item.color : "text-gray-700 group-hover:text-gray-900"
                          )}>
                            {item.title}
                          </p>
                          <p className={cn(
                            "text-[10px] truncate",
                            active ? item.color.replace('600', '500') : "text-gray-400"
                          )}>
                            {item.description}
                          </p>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Menu */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
          {bottomMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                  isActive 
                    ? "bg-gray-200 text-gray-900" 
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  isActive ? "bg-gray-300" : "bg-gray-200"
                )}>
                  <item.icon className="w-4 h-4" />
                </div>
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.title}</span>
                )}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarOpen ? "ml-72" : "ml-20"
      )}>
        {/* Top Header - Más elegante */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Breadcrumb placeholder */}
              </div>
              <div className="flex items-center gap-4">
                <NotificationsBell />
                <div className="h-8 w-px bg-gray-200" />
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8 min-h-[calc(100vh-73px)]">
          {children}
        </main>
      </div>
    </div>
  );
}