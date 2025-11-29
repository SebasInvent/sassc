"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { UserMenu } from '@/components/UserMenu';
import { usePermissions } from '@/hooks/usePermissions';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { TodayAppointmentsTable } from '@/components/dashboard/today-appointments-table';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { CriticalStockWidget } from '@/components/dashboard/critical-stock-widget';
import { NotificationsBell } from '@/components/dashboard/notifications-bell';
import { MedicoCapDashboard, DirectorIpsDashboard, AdminDashboard } from '@/components/dashboard/role-dashboards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  Pill, 
  Package, 
  FileCheck, 
  ClipboardList,
  Activity,
  Stethoscope,
  ArrowRight,
  Scan,
  BarChart3,
  Shield,
  Sparkles,
  TrendingUp,
  Building2,
  Hospital,
  ArrowRightLeft,
  DollarSign,
  Heart,
} from 'lucide-react';

const moduleCards = [
  // Módulos principales del Plan Maestro Medicare
  {
    title: 'Pacientes',
    description: 'Gestión territorializada de pacientes',
    icon: Users,
    href: '/dashboard/patients',
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    iconColor: 'text-blue-600',
    bgAccent: 'bg-blue-50',
    stats: 'Pacientes con CAP asignado',
    module: 'patients' as const,
  },
  {
    title: 'CAPs',
    description: 'Centros de Atención Primaria',
    icon: Building2,
    href: '/dashboard/caps',
    gradient: 'from-sky-500 via-cyan-600 to-teal-600',
    iconColor: 'text-sky-600',
    bgAccent: 'bg-sky-50',
    stats: 'Puerta de entrada al sistema',
    badge: 'Reforma',
  },
  {
    title: 'IPS',
    description: 'Hospitales y Clínicas',
    icon: Hospital,
    href: '/dashboard/ips',
    gradient: 'from-purple-500 via-violet-600 to-indigo-600',
    iconColor: 'text-purple-600',
    bgAccent: 'bg-purple-50',
    stats: 'Atención especializada',
    badge: 'Reforma',
  },
  {
    title: 'Remisiones',
    description: 'Sistema CAP → IPS territorializado',
    icon: ArrowRightLeft,
    href: '/dashboard/remisiones',
    gradient: 'from-indigo-500 via-blue-600 to-cyan-600',
    iconColor: 'text-indigo-600',
    bgAccent: 'bg-indigo-50',
    stats: 'Evitar paseo de la muerte',
    badge: 'Reforma',
  },
  {
    title: 'Citas',
    description: 'Programación y gestión de citas médicas',
    icon: Calendar,
    href: '/dashboard/appointments',
    gradient: 'from-emerald-500 via-green-600 to-teal-600',
    iconColor: 'text-emerald-600',
    bgAccent: 'bg-emerald-50',
    stats: 'Gestionar agenda',
    module: 'appointments' as const,
  },
  {
    title: 'Laboratorio',
    description: 'Órdenes y resultados de exámenes clínicos',
    icon: Activity,
    href: '/dashboard/laboratory',
    gradient: 'from-cyan-500 via-sky-600 to-blue-600',
    iconColor: 'text-cyan-600',
    bgAccent: 'bg-cyan-50',
    stats: 'Gestionar órdenes',
    module: 'laboratory' as const,
  },
  {
    title: 'Imágenes Diagnósticas',
    description: 'Radiología y estudios imagenológicos',
    icon: Scan,
    href: '/dashboard/imaging',
    gradient: 'from-indigo-500 via-purple-600 to-violet-600',
    iconColor: 'text-indigo-600',
    bgAccent: 'bg-indigo-50',
    stats: 'Gestionar estudios',
    module: 'imaging' as const,
  },
  {
    title: 'Farmacia',
    description: 'Dispensación de medicamentos prescritos',
    icon: Pill,
    href: '/dashboard/pharmacy',
    gradient: 'from-purple-500 via-fuchsia-600 to-pink-600',
    iconColor: 'text-purple-600',
    bgAccent: 'bg-purple-50',
    stats: 'Dispensar medicamentos',
    module: 'prescriptions' as const,
  },
  {
    title: 'Financiero (ADRES)',
    description: 'Pagos directos a IPS',
    icon: DollarSign,
    href: '/dashboard/financiero',
    gradient: 'from-emerald-500 via-green-600 to-lime-600',
    iconColor: 'text-emerald-600',
    bgAccent: 'bg-emerald-50',
    stats: 'Gestión de UPC',
    badge: 'Reforma',
  },
  {
    title: 'Modelo Preventivo',
    description: 'Programas de prevención y seguimiento',
    icon: Heart,
    href: '/dashboard/preventivo',
    gradient: 'from-rose-500 via-pink-600 to-red-600',
    iconColor: 'text-rose-600',
    bgAccent: 'bg-rose-50',
    stats: 'Salud poblacional',
    badge: 'Reforma',
  },
  {
    title: 'Analytics',
    description: 'Métricas y análisis del sistema',
    icon: BarChart3,
    href: '/dashboard/analytics',
    gradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
    iconColor: 'text-violet-600',
    bgAccent: 'bg-violet-50',
    stats: 'Ver reportes',
    module: 'analytics' as const,
  },
  {
    title: 'Usuarios y Roles',
    description: 'Gestión de usuarios y permisos',
    icon: Shield,
    href: '/dashboard/users',
    gradient: 'from-slate-700 via-gray-800 to-zinc-900',
    iconColor: 'text-slate-700',
    bgAccent: 'bg-slate-50',
    stats: 'Administrar accesos',
    badge: 'Admin',
    module: 'users' as const,
  },
];

export default function DashboardPage() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const { canView } = usePermissions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filtrar módulos según permisos del usuario
  const visibleModules = moduleCards.filter(module => {
    // Si no tiene campo module, mostrarlo siempre
    if (!module.module) return true;
    // Si tiene module, verificar permisos
    return canView(module.module);
  });

  // Renderizar dashboard según rol
  const renderRoleDashboard = () => {
    const role = user?.role?.toUpperCase();
    
    switch (role) {
      case 'MEDICO_CAP':
      case 'MEDICO':
        return <MedicoCapDashboard />;
      case 'DIRECTOR_IPS':
      case 'DIRECTOR':
        return <DirectorIpsDashboard />;
      case 'ADMIN':
      case 'ADMINISTRADOR':
        return <AdminDashboard />;
      default:
        // Dashboard genérico para otros roles
        return null;
    }
  };

  const roleDashboard = renderRoleDashboard();

  // Si hay un dashboard específico por rol, mostrarlo
  if (roleDashboard) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 lg:py-8">
          {roleDashboard}
        </div>
      </ProtectedRoute>
    );
  }

  // Dashboard genérico (para roles sin dashboard específico)
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 lg:py-8 space-y-6 lg:space-y-8">
        {/* Título de bienvenida */}
        <div className={`transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Bienvenido al Sistema SASSC</p>
        </div>

        {/* KPIs */}
        <div className={`transition-all duration-700 delay-100 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <KpiCards />
        </div>

        {/* Módulos Principales */}
        <div>
        <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Módulos del Sistema</h3>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.title} href={module.href}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden">
                  {module.badge && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        {module.badge}
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`${module.bgAccent} p-3 rounded-lg`}>
                        <Icon className={`h-6 w-6 ${module.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                          {module.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {module.description}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{module.stats}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

          {/* Gráficos y Widgets */}
          <div className={`grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <ActivityChart />
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <CriticalStockWidget />
            </div>
          </div>

          {/* Citas de Hoy */}
          <div className={`transition-all duration-700 delay-400 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  Citas de Hoy
                  <Calendar className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600" />
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Agenda del día actual</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-x-auto">
              <TodayAppointmentsTable />
            </div>
          </div>
      </div>
    </ProtectedRoute>
  );
}