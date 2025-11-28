"use client";

import { useAuth } from '@/context/AuthContext';

// Definir permisos por módulo
const PERMISSIONS = {
  // Gestión de Usuarios - Solo ADMIN
  users: {
    view: ['ADMIN'],
    create: ['ADMIN'],
    edit: ['ADMIN'],
    delete: ['ADMIN'],
  },
  
  // Pacientes - Todos excepto PATIENT
  patients: {
    view: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    create: ['ADMIN', 'RECEPTIONIST'],
    edit: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    delete: ['ADMIN'],
  },
  
  // Citas - Todos excepto PATIENT
  appointments: {
    view: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    create: ['ADMIN', 'RECEPTIONIST'],
    edit: ['ADMIN', 'RECEPTIONIST'],
    delete: ['ADMIN', 'RECEPTIONIST'],
  },
  
  // Prescripciones - Médicos y Farmacéuticos
  prescriptions: {
    view: ['ADMIN', 'DOCTOR', 'PHARMACIST', 'NURSE'],
    create: ['ADMIN', 'DOCTOR'],
    edit: ['ADMIN', 'DOCTOR'],
    delete: ['ADMIN', 'DOCTOR'],
    dispense: ['ADMIN', 'PHARMACIST'],
  },
  
  // Inventario - Farmacéuticos y Admin
  inventory: {
    view: ['ADMIN', 'PHARMACIST', 'DOCTOR'],
    create: ['ADMIN', 'PHARMACIST'],
    edit: ['ADMIN', 'PHARMACIST'],
    delete: ['ADMIN'],
  },
  
  // Autorizaciones - Médicos y Admin
  authorizations: {
    view: ['ADMIN', 'DOCTOR', 'PHARMACIST'],
    create: ['ADMIN', 'DOCTOR'],
    approve: ['ADMIN'],
    deny: ['ADMIN'],
  },
  
  // Laboratorio - Técnicos de Lab, Médicos y Admin
  laboratory: {
    view: ['ADMIN', 'DOCTOR', 'LAB_TECHNICIAN', 'NURSE'],
    create: ['ADMIN', 'DOCTOR'],
    uploadResults: ['ADMIN', 'LAB_TECHNICIAN'],
  },
  
  // Imágenes Diagnósticas - Radiólogos, Médicos y Admin
  imaging: {
    view: ['ADMIN', 'DOCTOR', 'RADIOLOGIST', 'NURSE'],
    create: ['ADMIN', 'DOCTOR'],
    uploadResults: ['ADMIN', 'RADIOLOGIST'],
  },
  
  // Analytics - Solo Admin y Médicos
  analytics: {
    view: ['ADMIN', 'DOCTOR'],
  },
};

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (module: keyof typeof PERMISSIONS, action: string): boolean => {
    if (!user || !user.role) return false;
    
    const modulePermissions = PERMISSIONS[module];
    if (!modulePermissions) return false;
    
    const actionPermissions = modulePermissions[action as keyof typeof modulePermissions];
    if (!actionPermissions) return false;
    
    return actionPermissions.includes(user.role);
  };

  const canView = (module: keyof typeof PERMISSIONS): boolean => {
    return hasPermission(module, 'view');
  };

  const canCreate = (module: keyof typeof PERMISSIONS): boolean => {
    return hasPermission(module, 'create');
  };

  const canEdit = (module: keyof typeof PERMISSIONS): boolean => {
    return hasPermission(module, 'edit');
  };

  const canDelete = (module: keyof typeof PERMISSIONS): boolean => {
    return hasPermission(module, 'delete');
  };

  const isAdmin = (): boolean => {
    return user?.role === 'ADMIN';
  };

  const isDoctor = (): boolean => {
    return user?.role === 'DOCTOR';
  };

  return {
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    isAdmin,
    isDoctor,
    userRole: user?.role,
  };
}
