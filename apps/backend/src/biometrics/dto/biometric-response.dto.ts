export class BiometricResponseDto {
  success: boolean;
  message: string;
  isNotRegistered?: boolean;
  registrationUrl?: string;
  verificationScore?: number;
  data?: any;
  errorCode?: string;
  timestamp?: Date;
}

export class BiometricStatsDto {
  totalRegistrations: number;
  activeRegistrations: number;
  suspendedRegistrations: number;
  revokedRegistrations: number;
  verificationsToday: number;
  successfulVerificationsToday: number;
  failedVerificationsToday: number;
  activeRA08Devices: number;
  onlineRA08Devices: number;
  lastUpdate: Date;
}

export class BiometricAuditDto {
  id: string;
  eventType: string;
  eventResult: string;
  eventDescription?: string;
  verificationScore?: number;
  livenessScore?: number;
  deviceId?: string;
  ipAddress?: string;
  createdAt: Date;
}
