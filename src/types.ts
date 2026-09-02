export type ChecklistStatus = 'PASS' | 'FAIL' | 'NA' | 'PENDING';

export interface ChecklistItem {
  number: number;
  requirement: string;
  remarkRequirement?: string;
  status: ChecklistStatus;
  userRemark: string;
  measuredValue?: string;
  sensorAttachment?: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface ActionItem {
  id: string;
  number: number;
  actionItem: string;
  pic: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Closed';
}

export interface ReportAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  sectionId?: string;
  itemNumber?: number;
  caption?: string;
  uploadedAt: string;
}

export interface SensorSnapshot {
  wifiStrength?: number;
  wifiStatus?: string;
  wifiDownlink?: number;
  wifiRtt?: number;
  magneticFieldUt?: number;
  magneticAnomaly?: boolean;
  magneticVector?: { x: number; y: number; z: number };
  recordedAt: string;
}

export interface SiteReport {
  id: string;
  userId: string;
  projectTitle: string;
  siteName: string;
  conductedBy: string;
  date: string;
  amrModel: string;
  customerName?: string;
  sections: ChecklistSection[];
  actionItems: ActionItem[];
  verifiedBy: string;
  verificationDate: string;
  verifierDesignation?: string;
  overallStatus: 'READY' | 'CONDITIONAL' | 'ACTION_REQUIRED' | 'NOT_READY';
  attachments: ReportAttachment[];
  sensorSnapshots: SensorSnapshot[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  organization?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WifiStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  strengthPercent: number;
  estimatedDbm: number;
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Disconnected';
  lastPingMs?: number;
  isSimulated?: boolean;
}

export interface MagneticStatus {
  available: boolean;
  magnitudeUt: number | null;
  x: number | null;
  y: number | null;
  z: number | null;
  anomalyLevel: 'Normal' | 'Moderate' | 'Severe' | 'Calibrating' | 'No Sensor';
  description: string;
  needsPermission: boolean;
  sensorType?: 'Magnetometer API' | 'Compass / Orientation' | 'None';
  errorReason?: string;
  isDetecting?: boolean;
}
