import type {
  User,
  EventItem,
  InventoryUnit,
  ReservationDetail,
  Booking,
  AdminMetrics,
  ReconciliationReport,
  AuditLog,
  MLForecast
} from '../types/index.ts';

const TOKEN_STORAGE_KEY = 'pulse_token';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      },
      credentials: 'include'
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data.message || data.error || `HTTP error ${res.status}`;
      throw new Error(message);
    }

    return data as T;
  }

  // --- Auth ---
  public async register(payload: { name: string; email: string; password: string }) {
    const res = await this.request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.token);
    return res;
  }

  public async login(payload: { email: string; password: string }) {
    const res = await this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.token);
    return res;
  }

  public async logout() {
    await this.request<{ message: string }>('/api/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  public async getCurrentUser() {
    return this.request<{ authenticated: boolean; user: User | null }>('/api/auth/me');
  }

  // --- Events & Inventory ---
  public async getServerTime(): Promise<number> {
    const res = await this.request<{ serverTime: number }>('/api/server-time');
    return res.serverTime;
  }

  public async getEvents(): Promise<{ events: EventItem[] }> {
    return this.request<{ events: EventItem[] }>('/api/events');
  }

  public async getEventInventory(eventId: string): Promise<{
    event: EventItem;
    summary: { total: number; available: number; held: number; confirmed: number };
    units: InventoryUnit[];
    serverTime: number;
  }> {
    return this.request(`/api/events/${eventId}/inventory`);
  }

  // --- Reservations ---
  public async createHold(eventId: string, unitId: string, idempotencyKey?: string) {
    return this.request<{
      message: string;
      reservationId: string;
      unitId: string;
      expiresAt: string;
      serverTime: number;
      generation: number;
    }>('/api/reservations/hold', {
      method: 'POST',
      body: JSON.stringify({ eventId, unitId, idempotencyKey })
    });
  }

  public async getReservation(reservationId: string): Promise<ReservationDetail> {
    return this.request<ReservationDetail>(`/api/reservations/${reservationId}`);
  }

  public async confirmReservation(reservationId: string, idempotencyKey?: string, simulatedPaymentToken?: string) {
    return this.request<{
      message: string;
      booking: Booking;
      serverTime: number;
    }>(`/api/reservations/${reservationId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey, simulatedPaymentToken })
    });
  }

  public async cancelReservation(reservationId: string) {
    return this.request<{
      message: string;
      success: boolean;
      serverTime: number;
    }>(`/api/reservations/${reservationId}/cancel`, {
      method: 'POST'
    });
  }

  // --- Bookings ---
  public async getBookings(): Promise<{ bookings: Booking[] }> {
    return this.request<{ bookings: Booking[] }>('/api/bookings');
  }

  public async getBooking(bookingId: string): Promise<{
    booking: Booking;
    unit: any;
    event: EventItem;
    serverTime: number;
  }> {
    return this.request(`/api/bookings/${bookingId}`);
  }

  // --- Admin ---
  public async getAdminMetrics(): Promise<AdminMetrics> {
    return this.request<AdminMetrics>('/api/admin/metrics');
  }

  public async getReconciliation(): Promise<{
    isRunning: boolean;
    lastReport: ReconciliationReport | null;
    history: ReconciliationReport[];
  }> {
    return this.request('/api/admin/reconciliation');
  }

  public async runReconciliation(): Promise<{ message: string; report: ReconciliationReport }> {
    return this.request('/api/admin/reconciliation/run', { method: 'POST' });
  }

  public async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return this.request<{ logs: AuditLog[] }>('/api/admin/audit-logs');
  }

  public async updateScheduler(config: { mode?: 'FIXED' | 'ADAPTIVE'; windowMs?: number; admissionRateLimit?: number }) {
    return this.request('/api/admin/scheduler', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  public async getMlForecast(): Promise<MLForecast> {
    return this.request<MLForecast>('/api/admin/ml-forecast');
  }

  public async simulateBurst(virtualUsers = 50, targetUnitCode = 'B-01'): Promise<{
    message: string;
    targetSeat: string;
    virtualUsersSubmitted: number;
    successfulClaims: number;
    rejectedCollisions: number;
    errors: number;
    durationMs: number;
    atomicInvariantVerified: boolean;
    summary: string;
  }> {
    return this.request('/api/admin/simulate-burst', {
      method: 'POST',
      body: JSON.stringify({ virtualUsers, targetUnitCode })
    });
  }
}

export const api = new ApiClient();
