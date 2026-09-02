import { AuthResponse, SiteReport, User } from '../types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('df_auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async register(email: string, password: string, name?: string, organization?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, organization }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register');
    }
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in');
    }
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch user profile');
    }
    return data;
  },

  // Reports
  async getReports(): Promise<SiteReport[]> {
    const res = await fetch(`${API_BASE}/reports`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch reports');
    }
    return data;
  },

  async getReport(id: string): Promise<SiteReport> {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch report');
    }
    return data;
  },

  async createReport(report: Partial<SiteReport>): Promise<SiteReport> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(report),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create report');
    }
    return data;
  },

  async updateReport(id: string, report: Partial<SiteReport>): Promise<SiteReport> {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(report),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update report');
    }
    return data;
  },

  async deleteReport(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete report');
    }
    return data;
  },

  async uploadAttachments(reportId: string, files: File[], sectionId?: string, itemNumber?: number, caption?: string) {
    const token = localStorage.getItem('df_auth_token');
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    if (sectionId) formData.append('sectionId', sectionId);
    if (itemNumber !== undefined) formData.append('itemNumber', itemNumber.toString());
    if (caption) formData.append('caption', caption);

    const res = await fetch(`${API_BASE}/reports/${reportId}/attachments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload attachments');
    }
    return data;
  },

  async deleteAttachment(reportId: string, attachmentId: string) {
    const res = await fetch(`${API_BASE}/reports/${reportId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete attachment');
    }
    return data;
  },

  async ping(): Promise<number> {
    const start = performance.now();
    const res = await fetch(`${API_BASE}/ping?t=${Date.now()}`);
    await res.json();
    const end = performance.now();
    return Math.round(end - start);
  },
};
