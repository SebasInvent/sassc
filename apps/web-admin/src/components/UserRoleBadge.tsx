"use client";

import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCog, Heart, Pill, Scan, FlaskConical, UserCheck, User } from 'lucide-react';

const roleConfig = {
  ADMIN: {
    label: 'Administrador',
    color: 'bg-red-500 hover:bg-red-600',
    icon: Shield,
  },
  DOCTOR: {
    label: 'Médico',
    color: 'bg-blue-500 hover:bg-blue-600',
    icon: Heart,
  },
  NURSE: {
    label: 'Enfermero/a',
    color: 'bg-green-500 hover:bg-green-600',
    icon: UserCog,
  },
  PHARMACIST: {
    label: 'Farmacéutico/a',
    color: 'bg-purple-500 hover:bg-purple-600',
    icon: Pill,
  },
  RADIOLOGIST: {
    label: 'Radiólogo/a',
    color: 'bg-orange-500 hover:bg-orange-600',
    icon: Scan,
  },
  LAB_TECHNICIAN: {
    label: 'Técnico Lab',
    color: 'bg-cyan-500 hover:bg-cyan-600',
    icon: FlaskConical,
  },
  RECEPTIONIST: {
    label: 'Recepcionista',
    color: 'bg-pink-500 hover:bg-pink-600',
    icon: UserCheck,
  },
  PATIENT: {
    label: 'Paciente',
    color: 'bg-gray-500 hover:bg-gray-600',
    icon: User,
  },
};

export function UserRoleBadge() {
  const { user } = useAuth();

  if (!user || !user.role) {
    return null;
  }

  const config = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.PATIENT;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.specialty || user.license}</p>
      </div>
      <Badge className={`${config.color} text-white flex items-center gap-1.5 px-3 py-1.5`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="font-semibold">{config.label}</span>
      </Badge>
    </div>
  );
}
