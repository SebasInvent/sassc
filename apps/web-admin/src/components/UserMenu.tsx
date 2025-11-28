"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  ChevronDown,
  Stethoscope,
  Heart,
  Activity
} from 'lucide-react';

const roleConfig = {
  ADMIN: { color: 'from-red-500 to-pink-500', icon: Shield },
  DOCTOR: { color: 'from-blue-500 to-cyan-500', icon: Stethoscope },
  NURSE: { color: 'from-green-500 to-emerald-500', icon: Heart },
  PHARMACIST: { color: 'from-purple-500 to-fuchsia-500', icon: Activity },
  RADIOLOGIST: { color: 'from-orange-500 to-amber-500', icon: Activity },
  LAB_TECHNICIAN: { color: 'from-cyan-500 to-blue-500', icon: Activity },
  RECEPTIONIST: { color: 'from-pink-500 to-rose-500', icon: User },
  PATIENT: { color: 'from-gray-500 to-slate-500', icon: User },
};

export function UserMenu() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debug: verificar estado del usuario
  useEffect(() => {
    console.log('UserMenu - Loading:', loading, 'User:', user);
  }, [loading, user]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    setTimeout(() => {
      router.push('/login');
    }, 100);
  };

  // Mostrar skeleton solo mientras está cargando
  if (loading || !user) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-100 border border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse" />
        <div className="hidden md:block space-y-1">
          <div className="h-3 w-20 bg-gray-300 rounded animate-pulse" />
          <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const config = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.PATIENT;
  const RoleIcon = config.icon;

  // Generar iniciales del nombre
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all duration-300 hover:scale-105 group"
      >
        {/* Avatar with Gradient */}
        <div className="relative">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
            {initials}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br ${config.color} border-2 border-white flex items-center justify-center`}>
            <RoleIcon className="h-2.5 w-2.5 text-white" />
          </div>
        </div>

        {/* User Info */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.specialty || user.license}</p>
        </div>

        {/* Chevron */}
        <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform duration-300 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className={`p-4 bg-gradient-to-br ${config.color} text-white`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border-2 border-white/30">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate">{user.name}</p>
                <p className="text-sm text-white/90 truncate">{user.specialty || 'Profesional de la salud'}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80">Licencia:</span>
                <span className="font-mono font-semibold bg-white/20 px-2 py-1 rounded">{user.license}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-white/80">Rol:</span>
                <span className="font-semibold bg-white/20 px-2 py-1 rounded flex items-center gap-1">
                  <RoleIcon className="h-3 w-3" />
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/dashboard/profile');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">Mi Perfil</p>
                <p className="text-xs text-gray-500">Ver y editar información</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/dashboard/settings');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                <Settings className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">Configuración</p>
                <p className="text-xs text-gray-500">Preferencias del sistema</p>
              </div>
            </button>
          </div>

          {/* Logout Button */}
          <div className="p-2 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                <LogOut className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-600">Cerrar Sesión</p>
                <p className="text-xs text-gray-500">Salir del sistema</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}