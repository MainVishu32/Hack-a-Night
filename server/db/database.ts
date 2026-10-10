import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  total_units: number;
  base_price: number;
  hold_duration_seconds: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'PAUSED';
  created_at: string;
}

export interface InventoryUnitRecord {
  id: string;
  event_id: string;
  unit_code: string;
  tier: 'VIP' | 'PREMIUM' | 'STANDARD';
  row_label: string;
  seat_number: number;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'RELEASING';
  current_reservation_id: string | null;
  current_generation: number;
  version: number;
  updated_at: string;
}

export interface ReservationRecord {
  id: string;
  event_id: string;
  unit_id: string;
  user_id: string;
  hold_token: string;
  generation: number;
  status: 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  idempotency_key?: string | null;
  expires_at: string;
  created_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
}

export interface BookingRecord {
  id: string;
  booking_reference: string;
  reservation_id: string;
  event_id: string;
  unit_id: string;
  user_id: string;
  amount: number;
  status: 'CONFIRMED' | 'REFUNDED';
  created_at: string;
}

export interface OutboxEventRecord {
  id: string;
  aggregate_type: 'RESERVATION' | 'BOOKING' | 'INVENTORY';
  aggregate_id: string;
  event_type: 'HOLD_ACQUIRED' | 'BOOKING_CONFIRMED' | 'HOLD_EXPIRED' | 'HOLD_CANCELLED';
  payload: any;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  retry_count: number;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface AuditLogRecord {
  id: string;
  event_type: string;
  entity_id: string;
  user_id?: string | null;
  details: any;
  ip_address?: string | null;
  created_at: string;
}

// PostgreSQL-backed repository with a process-local read cache.
class DatabaseEngine {
  private users = new Map<string, UserRecord>();
  private events = new Map<string, EventRecord>();
  private inventoryUnits = new Map<string, InventoryUnitRecord>();
  private reservations = new Map<string, ReservationRecord>();
  private bookings = new Map<string, BookingRecord>();
  private outboxEvents = new Map<string, OutboxEventRecord>();
  private auditLogs: AuditLogRecord[] = [];

  private isInitialized = false;
  private pool: Pool | null = null;

  private get pg(): Pool { if (!this.pool) throw new Error('PostgreSQL is not initialized. Configure DATABASE_URL.'); return this.pool; }
  private async persistSeed() {
    const p=this.pg;
    for (const u of this.users.values()) await p.query(`INSERT INTO users(id,name,email,password_hash,role,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,[u.id,u.name,u.email,u.password_hash,u.role,u.created_at,u.updated_at]);
    for (const e of this.events.values()) await p.query(`INSERT INTO events(id,title,description,venue,starts_at,total_units,base_price,hold_duration_seconds,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING`,[e.id,e.title,e.description,e.venue,e.starts_at,e.total_units,e.base_price,e.hold_duration_seconds,e.status,e.created_at]);
    for (const u of this.inventoryUnits.values()) await p.query(`INSERT INTO inventory_units(id,event_id,unit_code,tier,row_label,seat_number,price,status,current_reservation_id,current_generation,version,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO NOTHING`,[u.id,u.event_id,u.unit_code,u.tier,u.row_label,u.seat_number,u.price,u.status,u.current_reservation_id,u.current_generation,u.version,u.updated_at]);
    for (const r of this.reservations.values()) await p.query(`INSERT INTO reservations(id,event_id,unit_id,user_id,hold_token,generation,status,idempotency_key,expires_at,created_at,confirmed_at,cancelled_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO NOTHING`,[r.id,r.event_id,r.unit_id,r.user_id,r.hold_token,r.generation,r.status,r.idempotency_key||null,r.expires_at,r.created_at,r.confirmed_at||null,r.cancelled_at||null]);
    for (const b of this.bookings.values()) await p.query(`INSERT INTO bookings(id,booking_reference,reservation_id,event_id,unit_id,user_id,amount,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,[b.id,b.booking_reference,b.reservation_id,b.event_id,b.unit_id,b.user_id,b.amount,b.status,b.created_at]);
  }
  private async loadPersistentState() {
    const p=this.pg;
    const users=await p.query('SELECT * FROM users');
    for(const r of users.rows) this.users.set(r.id,{...r,created_at:new Date(r.created_at).toISOString(),updated_at:new Date(r.updated_at).toISOString()});
    const events=await p.query('SELECT * FROM events'); for(const r of events.rows) this.events.set(r.id,{...r,starts_at:new Date(r.starts_at).toISOString(),created_at:new Date(r.created_at).toISOString(),base_price:Number(r.base_price)});
    const units=await p.query('SELECT * FROM inventory_units'); for(const r of units.rows) this.inventoryUnits.set(r.id,{...r,price:Number(r.price),current_generation:Number(r.current_generation),version:Number(r.version),updated_at:new Date(r.updated_at).toISOString()});
    const reservations=await p.query('SELECT * FROM reservations'); for(const r of reservations.rows) this.reservations.set(r.id,{...r,generation:Number(r.generation),expires_at:new Date(r.expires_at).toISOString(),created_at:new Date(r.created_at).toISOString(),confirmed_at:r.confirmed_at?new Date(r.confirmed_at).toISOString():null,cancelled_at:r.cancelled_at?new Date(r.cancelled_at).toISOString():null});
    const bookings=await p.query('SELECT * FROM bookings'); for(const r of bookings.rows) this.bookings.set(r.id,{...r,amount:Number(r.amount),created_at:new Date(r.created_at).toISOString()});
    const outbox=await p.query('SELECT * FROM outbox_events'); for(const r of outbox.rows) this.outboxEvents.set(r.id,{...r,payload:r.payload,created_at:new Date(r.created_at).toISOString(),processed_at:r.processed_at?new Date(r.processed_at).toISOString():null});
    const audits=await p.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500'); this.auditLogs=audits.rows.map(r=>({...r,details:r.details,created_at:new Date(r.created_at).toISOString()}));
  }
  public async init() {
    if (this.isInitialized) return;
    const connectionString=process.env.DATABASE_URL || 'postgresql://pulse_user:pulse_secure_pass_2026@127.0.0.1:5432/pulsereserve_db';
    this.pool=new Pool({connectionString,max:20,connectionTimeoutMillis:5000});
    await this.pg.query('SELECT 1');
    const schema=await readFile(new URL('./schema.sql', import.meta.url),'utf8');
    await this.pg.query(schema);
    const count=await this.pg.query('SELECT COUNT(*)::int AS count FROM users');
    if(Number(count.rows[0].count)>0) await this.loadPersistentState();
    else { await this.seedInitialData(); await this.persistSeed(); }
    this.isInitialized=true;
    console.log('[PulseReserve] Connected to PostgreSQL; durable state loaded.');
  }
  public async close(){ if(this.pool) await this.pool.end(); this.pool=null; this.isInitialized=false; }

  private async seedInitialData() {
    // 1. Seed Admin User
    const adminPasswordHash = await bcrypt.hash('PulseAdmin2026!', 10);
    const adminUser: UserRecord = {
      id: 'usr_admin_001',
      name: 'System Administrator',
      email: 'admin@pulsereserve.io',
      password_hash: adminPasswordHash,
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(adminUser.id, adminUser);

    // Seed Standard Demo User
    const demoPasswordHash = await bcrypt.hash('DemoUser2026!', 10);
    const demoUser: UserRecord = {
      id: 'usr_demo_002',
      name: 'Alex Mercer',
      email: 'alex@example.com',
      password_hash: demoPasswordHash,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(demoUser.id, demoUser);

    // 2. Seed Default Event: "Quantum Cloud Summit 2026"
    const eventId = 'evt_summit_2026';
    const demoEvent: EventRecord = {
      id: eventId,
      title: 'Global Tech Summit 2026 Keynote',
      description: 'Annual high-throughput cloud computing, distributed systems, and real-time infrastructure keynote conference.',
      venue: 'Metropolis Convention Arena · Grand Hall A',
      starts_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      total_units: 200,
      base_price: 180.00,
      hold_duration_seconds: 300, // 5 minute reservation hold
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
    this.events.set(demoEvent.id, demoEvent);

    // 3. Seed Exactly 200 Inventory Units: 10 rows (A-J), 20 seats each
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (const row of rows) {
      for (let s = 1; s <= 20; s++) {
        const unitId = `unit_${row}_${s.toString().padStart(2, '0')}`;
        const unitCode = `${row}-${s.toString().padStart(2, '0')}`;
        
        let tier: 'VIP' | 'PREMIUM' | 'STANDARD' = 'STANDARD';
        let price = 140.00;
        if (row === 'A' || row === 'B') {
          tier = 'VIP';
          price = 280.00;
        } else if (row === 'C' || row === 'D' || row === 'E') {
          tier = 'PREMIUM';
          price = 195.00;
        }

        const unitRecord: InventoryUnitRecord = {
          id: unitId,
          event_id: eventId,
          unit_code: unitCode,
          tier,
          row_label: row,
          seat_number: s,
          price,
          status: 'AVAILABLE',
          current_reservation_id: null,
          current_generation: 0,
          version: 1,
          updated_at: new Date().toISOString()
        };
        this.inventoryUnits.set(unitId, unitRecord);
      }
    }

    // Seed 4 initial confirmed sample bookings to demonstrate live visual diversity
    const sampleUnits = ['unit_A_01', 'unit_A_02', 'unit_C_10', 'unit_F_08'];
    for (const uId of sampleUnits) {
      const unit = this.inventoryUnits.get(uId);
      if (unit) {
        const resId = `res_init_${uId}`;
        const bookingId = `bk_init_${uId}`;
        const res: ReservationRecord = {
          id: resId,
          event_id: eventId,
          unit_id: uId,
          user_id: demoUser.id,
          hold_token: `token_init_${Math.random().toString(36).substring(2)}`,
          generation: 1,
          status: 'CONFIRMED',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          created_at: new Date(Date.now() - 3600000).toISOString(),
          confirmed_at: new Date(Date.now() - 3500000).toISOString()
        };
        this.reservations.set(resId, res);

        const booking: BookingRecord = {
          id: bookingId,
          booking_reference: `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          reservation_id: resId,
          event_id: eventId,
          unit_id: uId,
          user_id: demoUser.id,
          amount: unit.price,
          status: 'CONFIRMED',
          created_at: new Date(Date.now() - 3500000).toISOString()
        };
        this.bookings.set(bookingId, booking);

        unit.status = 'CONFIRMED';
        unit.current_reservation_id = resId;
        unit.current_generation = 1;
        unit.version += 1;
      }
    }

    this.logAudit({
      id: `aud_seed_${Date.now()}`,
      event_type: 'SYSTEM_SEEDED',
      entity_id: eventId,
      details: { total_units: 200, seeded_bookings: sampleUnits.length },
      created_at: new Date().toISOString()
    });
  }

  // --- Users Operations ---
  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized=email.trim().toLowerCase(); const result=await this.pg.query('SELECT * FROM users WHERE lower(email)=$1',[normalized]);
    if(!result.rows[0]) return null; const r=result.rows[0] as UserRecord; this.users.set(r.id,r); return {...r};
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    const result=await this.pg.query('SELECT * FROM users WHERE id=$1',[id]); if(!result.rows[0]) return null; const r=result.rows[0] as UserRecord; this.users.set(r.id,r); return {...r};
  }

  public async createUser(userData: Omit<UserRecord, 'created_at' | 'updated_at'>): Promise<UserRecord> {
    const normalized = userData.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(normalized);
    if (existing) {
      throw new Error(`User with email "${normalized}" already exists.`);
    }

    const now = new Date().toISOString();
    const record: UserRecord = {
      ...userData,
      email: normalized,
      created_at: now,
      updated_at: now
    };
    this.users.set(record.id, record);
    await this.pg.query(`INSERT INTO users(id,name,email,password_hash,role,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7)`,[record.id,record.name,record.email,record.password_hash,record.role,record.created_at,record.updated_at]);
    return { ...record };
  }

  // --- Events Operations ---
  public async getAllEvents(): Promise<EventRecord[]> {
    const result=await this.pg.query('SELECT * FROM events ORDER BY created_at'); return result.rows.map((r:any)=>({...r,base_price:Number(r.base_price),starts_at:new Date(r.starts_at).toISOString(),created_at:new Date(r.created_at).toISOString()}));
  }

  public async getEventById(id: string): Promise<EventRecord | null> {
    const result=await this.pg.query('SELECT * FROM events WHERE id=$1',[id]); if(!result.rows[0]) return null; const r=result.rows[0]; return {...r,base_price:Number(r.base_price),starts_at:new Date(r.starts_at).toISOString(),created_at:new Date(r.created_at).toISOString()};
  }

  // --- Inventory Units Operations ---
  public async getInventoryUnitsByEvent(eventId: string): Promise<InventoryUnitRecord[]> {
    const result=await this.pg.query('SELECT * FROM inventory_units WHERE event_id=$1 ORDER BY row_label,seat_number',[eventId]);
    return result.rows.map((r:any)=>({...r,price:Number(r.price),current_generation:Number(r.current_generation),version:Number(r.version),updated_at:new Date(r.updated_at).toISOString()}));
  }

  public async getInventoryUnitById(id: string): Promise<InventoryUnitRecord | null> {
    const result=await this.pg.query('SELECT * FROM inventory_units WHERE id=$1',[id]); if(!result.rows[0]) return null; const r=result.rows[0]; return {...r,price:Number(r.price),current_generation:Number(r.current_generation),version:Number(r.version),updated_at:new Date(r.updated_at).toISOString()};
  }

  public async updateInventoryUnit(
    id: string,
    updates: Partial<InventoryUnitRecord>
  ): Promise<InventoryUnitRecord> {
    const unit = await this.getInventoryUnitById(id);
    if (!unit) {
      throw new Error(`Inventory unit "${id}" not found.`);
    }
    const updated: InventoryUnitRecord = {
      ...unit,
      ...updates,
      version: unit.version + 1,
      updated_at: new Date().toISOString()
    };
    this.inventoryUnits.set(id, updated);
    await this.pg.query(`UPDATE inventory_units SET status=$2,current_reservation_id=$3,current_generation=$4,version=$5,updated_at=$6 WHERE id=$1`,[id,updated.status,updated.current_reservation_id,updated.current_generation,updated.version,updated.updated_at]);
    return { ...updated };
  }

  // --- Reservations Operations ---
  public async createReservation(res: ReservationRecord): Promise<ReservationRecord> {
    if (res.idempotency_key) {
      for (const existing of this.reservations.values()) {
        if (existing.idempotency_key === res.idempotency_key) {
          return { ...existing };
        }
      }
    }
    await this.pg.query(`INSERT INTO reservations(id,event_id,unit_id,user_id,hold_token,generation,status,idempotency_key,expires_at,created_at,confirmed_at,cancelled_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[res.id,res.event_id,res.unit_id,res.user_id,res.hold_token,res.generation,res.status,res.idempotency_key||null,res.expires_at,res.created_at,res.confirmed_at||null,res.cancelled_at||null]);
    this.reservations.set(res.id, { ...res });
    return { ...res };
  }

  public async getReservationById(id: string): Promise<ReservationRecord | null> {
    const result=await this.pg.query('SELECT * FROM reservations WHERE id=$1',[id]); if(!result.rows[0]) return null; const r=result.rows[0]; return {...r,generation:Number(r.generation),expires_at:new Date(r.expires_at).toISOString(),created_at:new Date(r.created_at).toISOString(),confirmed_at:r.confirmed_at?new Date(r.confirmed_at).toISOString():null,cancelled_at:r.cancelled_at?new Date(r.cancelled_at).toISOString():null};
  }

  public async updateReservation(
    id: string,
    updates: Partial<ReservationRecord>
  ): Promise<ReservationRecord> {
    const res = await this.getReservationById(id);
    if (!res) {
      throw new Error(`Reservation "${id}" not found.`);
    }
    const updated: ReservationRecord = {
      ...res,
      ...updates
    };
    await this.pg.query(`UPDATE reservations SET status=$2,confirmed_at=$3,cancelled_at=$4,expires_at=$5,generation=$6 WHERE id=$1`,[id,updated.status,updated.confirmed_at||null,updated.cancelled_at||null,updated.expires_at,updated.generation]);
    this.reservations.set(id, updated);
    return { ...updated };
  }

  public async getActiveHolds(): Promise<ReservationRecord[]> {
    const result=await this.pg.query("SELECT * FROM reservations WHERE status='HELD' AND expires_at>NOW()"); return result.rows.map((r:any)=>({...r,generation:Number(r.generation),expires_at:new Date(r.expires_at).toISOString(),created_at:new Date(r.created_at).toISOString()}));
  }

  public async getExpiredUnreleasedHolds(): Promise<ReservationRecord[]> {
    const result=await this.pg.query("SELECT * FROM reservations WHERE status='HELD' AND expires_at<=NOW()"); return result.rows.map((r:any)=>({...r,generation:Number(r.generation),expires_at:new Date(r.expires_at).toISOString(),created_at:new Date(r.created_at).toISOString()}));
  }

  /** Atomically persist the booking, reservation state, inventory projection and outbox event. */
  public async finalizeBooking(booking: BookingRecord, reservationId: string, unitId: string, generation: number, outboxPayload: any): Promise<BookingRecord> {
    const client=await this.pg.connect();
    const now=new Date().toISOString();
    const outbox: OutboxEventRecord={id:`outbox_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,aggregate_type:'BOOKING',aggregate_id:booking.id,event_type:'BOOKING_CONFIRMED',payload:outboxPayload,status:'PENDING',retry_count:0,last_error:null,created_at:now,processed_at:null};
    try {
      await client.query('BEGIN');
      const existing=await client.query('SELECT * FROM bookings WHERE reservation_id=$1',[reservationId]);
      if(existing.rows[0]) {
        await client.query('COMMIT');
        const r=existing.rows[0];
        const existingBooking={...r,amount:Number(r.amount),created_at:new Date(r.created_at).toISOString()} as BookingRecord;
        this.bookings.set(existingBooking.id,existingBooking); return existingBooking;
      }
      await client.query(`INSERT INTO bookings(id,booking_reference,reservation_id,event_id,unit_id,user_id,amount,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[booking.id,booking.booking_reference,booking.reservation_id,booking.event_id,booking.unit_id,booking.user_id,booking.amount,booking.status,booking.created_at]);
      const resUpdate=await client.query(`UPDATE reservations SET status='CONFIRMED',confirmed_at=$2 WHERE id=$1 AND user_id=$3 AND status IN ('HELD','CONFIRMED')`,[reservationId,now,booking.user_id]);
      if(resUpdate.rowCount!==1) throw new Error('Reservation is no longer confirmable in PostgreSQL.');
      await client.query(`UPDATE inventory_units SET status='CONFIRMED',current_generation=$2,version=version+1,updated_at=$3 WHERE id=$1`,[unitId,generation,now]);
      await client.query(`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload,status,retry_count,last_error,created_at,processed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[outbox.id,outbox.aggregate_type,outbox.aggregate_id,outbox.event_type,JSON.stringify(outbox.payload),outbox.status,outbox.retry_count,outbox.last_error,outbox.created_at,outbox.processed_at]);
      await client.query('COMMIT');
      this.bookings.set(booking.id,{...booking});
      const res=this.reservations.get(reservationId); if(res) this.reservations.set(reservationId,{...res,status:'CONFIRMED',confirmed_at:now});
      const unit=this.inventoryUnits.get(unitId); if(unit) this.inventoryUnits.set(unitId,{...unit,status:'CONFIRMED',current_generation:generation,version:unit.version+1,updated_at:now});
      this.outboxEvents.set(outbox.id,outbox);
      return {...booking};
    } catch(error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
    finally { client.release(); }
  }

  // --- Bookings Operations ---
  public async createBooking(booking: BookingRecord): Promise<BookingRecord> {
    // ENFORCE STRICT INVARIANT: UNIQUE(event_id, unit_id)
    for (const existing of this.bookings.values()) {
      if (existing.event_id === booking.event_id && existing.unit_id === booking.unit_id) {
        throw new Error(`Double booking conflict: Unit "${booking.unit_id}" already confirmed for event "${booking.event_id}".`);
      }
    }

    this.bookings.set(booking.id, { ...booking });
    await this.pg.query(`INSERT INTO bookings(id,booking_reference,reservation_id,event_id,unit_id,user_id,amount,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[booking.id,booking.booking_reference,booking.reservation_id,booking.event_id,booking.unit_id,booking.user_id,booking.amount,booking.status,booking.created_at]);
    return { ...booking };
  }

  public async getBookingsByUser(userId: string): Promise<BookingRecord[]> {
    const result=await this.pg.query('SELECT * FROM bookings WHERE user_id=$1 ORDER BY created_at DESC',[userId]); return result.rows.map((r:any)=>({...r,amount:Number(r.amount),created_at:new Date(r.created_at).toISOString()}));
  }

  public async getAllBookings(): Promise<BookingRecord[]> {
    const result=await this.pg.query('SELECT * FROM bookings ORDER BY created_at DESC'); return result.rows.map((r:any)=>({...r,amount:Number(r.amount),created_at:new Date(r.created_at).toISOString()}));
  }

  public async getBookingById(id: string): Promise<BookingRecord | null> {
    const result=await this.pg.query('SELECT * FROM bookings WHERE id=$1',[id]); if(!result.rows[0]) return null; const r=result.rows[0]; return {...r,amount:Number(r.amount),created_at:new Date(r.created_at).toISOString()};
  }

  public async getBookingByReservationId(resId: string): Promise<BookingRecord | null> {
    const result=await this.pg.query('SELECT * FROM bookings WHERE reservation_id=$1',[resId]); if(!result.rows[0]) return null; const r=result.rows[0]; return {...r,amount:Number(r.amount),created_at:new Date(r.created_at).toISOString()};
  }

  // --- Transactional Outbox Operations ---
  public async queueOutboxEvent(
    aggregate_type: 'RESERVATION' | 'BOOKING' | 'INVENTORY',
    aggregate_id: string,
    event_type: 'HOLD_ACQUIRED' | 'BOOKING_CONFIRMED' | 'HOLD_EXPIRED' | 'HOLD_CANCELLED',
    payload: any
  ): Promise<OutboxEventRecord> {
    const record: OutboxEventRecord = {
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      aggregate_type,
      aggregate_id,
      event_type,
      payload,
      status: 'PENDING',
      retry_count: 0,
      last_error: null,
      created_at: new Date().toISOString(),
      processed_at: null
    };
    this.outboxEvents.set(record.id, record);
    await this.pg.query(`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload,status,retry_count,last_error,created_at,processed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[record.id,record.aggregate_type,record.aggregate_id,record.event_type,JSON.stringify(record.payload),record.status,record.retry_count,record.last_error,record.created_at,record.processed_at]);
    return { ...record };
  }

  public async getPendingOutboxEvents(limit = 20): Promise<OutboxEventRecord[]> {
    const result=await this.pg.query("SELECT * FROM outbox_events WHERE status='PENDING' OR (status='FAILED' AND retry_count<5) ORDER BY created_at LIMIT $1",[limit]);
    return result.rows.map((r:any)=>({...r,payload:r.payload,created_at:new Date(r.created_at).toISOString(),processed_at:r.processed_at?new Date(r.processed_at).toISOString():null}));
  }

  public async updateOutboxEvent(
    id: string,
    updates: Partial<OutboxEventRecord>
  ): Promise<OutboxEventRecord> {
    const event = this.outboxEvents.get(id);
    if (!event) throw new Error(`Outbox event "${id}" not found.`);
    const updated: OutboxEventRecord = { ...event, ...updates };
    this.outboxEvents.set(id, updated);
    await this.pg.query(`UPDATE outbox_events SET status=$2,retry_count=$3,last_error=$4,processed_at=$5 WHERE id=$1`,[id,updated.status,updated.retry_count,updated.last_error,updated.processed_at]);
    return { ...updated };
  }

  public async getOutboxCount(): Promise<{ pending: number; processed: number; failed: number }> {
    let pending = 0;
    let processed = 0;
    let failed = 0;
    for (const ev of this.outboxEvents.values()) {
      if (ev.status === 'PENDING' || ev.status === 'PROCESSING') pending++;
      else if (ev.status === 'PROCESSED') processed++;
      else if (ev.status === 'FAILED') failed++;
    }
    return { pending, processed, failed };
  }

  // --- Audit Logs ---
  public logAudit(log: AuditLogRecord): void {
    this.auditLogs.unshift({ ...log });
    if(this.pool) void this.pool.query(`INSERT INTO audit_logs(id,event_type,entity_id,user_id,details,ip_address,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,[log.id,log.event_type,log.entity_id,log.user_id||null,JSON.stringify(log.details??{}),log.ip_address||null,log.created_at]).catch(e=>console.error('[PulseReserve] audit persistence failed',e.message));
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  public getRecentAuditLogs(limit = 50): AuditLogRecord[] {
    return this.auditLogs.slice(0, limit);
  }
}

export const db = new DatabaseEngine();
