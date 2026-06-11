// Device session type definitions

// User agent info
export interface UserAgentInfo {
  raw_ua: string;
  browser: string;
  version: string;
  os: string;
  platform: string;
  is_mobile: boolean;
  is_tablet: boolean;
  is_pc: boolean;
  is_client: boolean;
}

// Location info
export interface LocationInfo {
  country: string;
  city: string;
  country_code: string;
}

// Login session
export interface Session {
  id: number;
  user_id: number;
  user_agent: string;
  is_verified: boolean;
  created_at: string;
  verified_at: string | null;
  expires_at: string;
  device_id: number | null;
  user_agent_info: UserAgentInfo;
  location: LocationInfo;
}

// Trusted device
export interface TrustedDevice {
  id: number;
  user_id: number;
  user_agent: string;
  client_type: 'web' | 'mobile' | 'desktop';
  created_at: string;
  last_used_at: string;
  expires_at: string;
  user_agent_info: UserAgentInfo;
  location: LocationInfo;
}

// Session list response
export interface SessionsResponse {
  total: number;
  current: number;
  sessions: Session[];
}

// Trusted device list response
export interface TrustedDevicesResponse {
  total: number;
  current: number;
  devices: TrustedDevice[];
}

// Legacy device session type (kept for compatibility with existing code)
export interface DeviceSession {
  id: number;
  device_type: string;
  device_fingerprint: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  is_current: boolean;
  location?: string;
  client_display_name?: string;
}

export interface RevokeSessionRequest {
  session_id: number;
}

export interface RevokeSessionResponse {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

export interface DeviceSummary {
  success: boolean;
  message: string;
  data: Record<string, any>;
}
