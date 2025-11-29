import { API_URL } from '@/lib/api';

// Types
export interface BiometricStats {
  totalRegistrations: number;
  facialRegistrations: number;
  fingerprintRegistrations: number;
  todayCheckins: number;
  successRate: number;
}

export interface BiometricRegistrationData {
  patientId: string;
  biometricType: 'facial' | 'fingerprint';
  biometricData: string;
}

export interface BiometricVerificationData {
  biometricType: 'facial' | 'fingerprint';
  biometricData: string;
}

export interface BiometricLoginData {
  method: 'FACIAL' | 'FINGERPRINT' | 'RA08';
  faceImageBase64?: string;
  fingerprintTemplate?: string;
  deviceId?: string;
}

export interface BiometricCheckinData {
  type: 'APPOINTMENT' | 'WALK_IN' | 'EMERGENCY';
  faceImageBase64: string;
  appointmentId?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  temperature?: number;
}

export interface BiometricSearchData {
  faceImageBase64?: string;
  fingerprintTemplate?: string;
  documentNumber?: string;
  maxResults?: number;
  confidenceThreshold?: number;
}

export interface BiometricResult {
  success: boolean;
  isNotRegistered?: boolean;
  registrationUrl?: string;
  verificationScore?: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    documentNumber: string;
  };
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  appointment?: {
    id: string;
    practitionerName: string;
  };
  accessToken?: string;
  message?: string;
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || localStorage.getItem('accessToken');
  }
  return null;
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || 'API Error') as any;
    error.response = { data: errorData, status: response.status };
    throw error;
  }

  return response.json();
};

// Biometric Service
export const biometricService = {
  // Get biometric statistics
  getStats: async (): Promise<BiometricStats> => {
    try {
      return await apiRequest<BiometricStats>('/biometric/stats');
    } catch (error) {
      // Return default stats if endpoint doesn't exist yet
      return {
        totalRegistrations: 0,
        facialRegistrations: 0,
        fingerprintRegistrations: 0,
        todayCheckins: 0,
        successRate: 0,
      };
    }
  },

  // Register biometric data
  register: async (data: BiometricRegistrationData): Promise<BiometricResult> => {
    return apiRequest<BiometricResult>('/biometric/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Verify biometric data
  verify: async (data: BiometricVerificationData): Promise<BiometricResult> => {
    return apiRequest<BiometricResult>('/biometric/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Login with biometric
  login: async (data: BiometricLoginData): Promise<BiometricResult> => {
    return apiRequest<BiometricResult>('/auth/biometric-login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Check-in with biometric
  checkin: async (data: BiometricCheckinData): Promise<BiometricResult> => {
    return apiRequest<BiometricResult>('/biometric/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Search by biometric
  search: async (data: BiometricSearchData): Promise<any[]> => {
    return apiRequest<any[]>('/biometric/search', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get registration status for a patient
  getRegistrationStatus: async (patientId: string): Promise<{
    hasFacial: boolean;
    hasFingerprint: boolean;
    lastUpdated?: string;
  }> => {
    try {
      return await apiRequest(`/biometric/status/${patientId}`);
    } catch (error) {
      return {
        hasFacial: false,
        hasFingerprint: false,
      };
    }
  },
};

export default biometricService;
