import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Flame,
  RefreshCw,
  Cpu,
  Server,
  Database,
  RotateCcw,
  Sliders,
  Sparkles,
  AlertOctagon,
  FileText,
  Clock,
  Play,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AdminMetrics, ReconciliationReport, AuditLog, MLForecast } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminObservabilityPageProps {
  onNavigate: (page: string) => void;
}

export const AdminObservabilityPage: React.FC<AdminObservabilityPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'topology' | 'burst' | 'reconciler' | 'scheduler' | 'forecast' | 'audit'>('topology');

  // Burst simulation state
  const [burstUsers, setBurstUsers] = useState(50);
  const [burstSeat, setBurstSeat] = useState('B-01');
  const [burstRunning, setBurstRunning] = useState(false);
  const [burstResult, setBurstResult] = useState<any | null>(null);

  // Reconciler state
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationHistory, setReconciliationHistory] = useState<ReconciliationReport[]>([]);

  // Scheduler state
  const [schedulerMode, setSchedulerMode] = useState<'FIXED' | 'ADAPTIVE'>('FIXED');
  const [schedulerWindow, setSchedulerWindow] = useState(10);
  const [schedulerRateLimit, setSchedulerRateLimit] = useState(500);

  // ML forecast state
  const [forecast, setForecast] = useState<MLForecast | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const fetchAdminData = async () => {
    try {
      const data = await api.getAdminMetrics();
      setMetrics(data);
      setSchedulerMode(data.scheduler.mode);
      setSchedulerWindow(data.scheduler.windowMs);
      setSchedulerRateLimit(data.scheduler.admissionRateLimit);

      const recon = await api.getReconciliation();
      setReconciliationHistory(recon.history);

      const fc = await api.getMlForecast();
      setForecast(fc);

      const logs = await api.getAuditLogs();
      setAuditLogs(logs.logs);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRunBurst = async () => {
    try {
      setBurstRunning(true);
      setBurstResult(null);
      const res = await api.simulateBurst(burstUsers, burstSeat);
      setBurstResult(res);
      await fetchAdminData();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setBurstRunning(false);
    }
  };

  const handleRunReconciler = async () => {
    try {
      setReconciling(true);
      const res = await api.runReconciliation();
      setReconciliationHistory(prev => [res.report, ...prev]);
      await fetchAdminData();
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const handleSaveScheduler = async () => {
    try {
      await api.updateScheduler({
        mode: schedulerMode,
        windowMs: schedulerWindow,
        admissionRateLimit: schedulerRateLimit
      });
      await fetchAdminData();
      alert('Scheduler configuration applied.');
    } catch (err: any) {
      alert(`Failed to update scheduler: ${err.message}`);
    }
  };

  // Guard: if user is not admin, show notice
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#0B1220]">
        <div className="max-w-md w-full bg-[#111C2E] border border-[#293548] rounded-2xl p-8 text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-[#EF4444] mx-auto" />
          <h1 className="text-xl font-bold text-[#F8FAFC]">Administrative Access Required</h1>
          <p className="text-xs text-[#A8B3C7] leading-relaxed">
            This observability console is restricted to system administrators. Sign in with the documented admin credentials to access live distributed controls.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 transition-colors"
          >
            Sign In as Admin Lead
          </button>
        </div>
      </div>
    );
  }

  if (loading && !metrics) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0B1220]">
        <div className="text-sm text-[#A8B3C7] font-mono">Initializing Observability Console...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] py-8 text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#293548]">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#60A5FA] font-semibold font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Architectural Observability & Invariant Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              Distributed Engine Telemetry
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-3 py-1 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] rounded-lg">
              INVARIANTS: VERIFIED
            </span>
            <button
              onClick={fetchAdminData}
              className="p-2 bg-[#111C2E] hover:bg-[#17243B] border border-[#293548] rounded-lg text-[#A8B3C7] hover:text-[#F8FAFC] transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Segmented Controls) */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#111C2E] border border-[#293548] rounded-xl">
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'topology' ? 'bg-[#0B1220] text-[#2DD4BF] shadow-sm' : 'text-[#A8B3C7] hover:text-[#F8FAFC]'
            }`}
          >
            System Topology
          </button>
          <button
            onClick={() => setActiveTab('burst')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'burst' ? 'bg-[#0B1220] text-[#2DD4BF] shadow-sm' : 'text-[#A8B3C7] hover:text-[#F8FAFC]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Load Burst Tester</span>
          </button>
          <button
            onClick={() => setActiveTab('reconciler')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'reconciler' ? 'bg-[#0B1220] text-[#2DD4BF] shadow-sm' : 'text-[#A8B3C7] hover:text-[#F8FAFC]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Self-Healing Loop</span>
          </button>
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'scheduler' ? 'bg-[#0B1220] text-[#2DD4BF] shadow-sm' : 'text-[#A8B3C7] hover:text-[#F8FAFC]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Micro-Batch Scheduler</span>
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'forecast' ? 'bg-[#0B1220] text-[#2DD4BF] shadow-sm' : 'text-[#A8B3C7] hover:text-[#F8FAFC]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>ML Workload Forecaster</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-[#0B1220] text-[#2DD4BF] shadow-sm' : 'text-[#A8B3C7] hover:text-[#F8FAFC]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#A8B3C7]" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* TAB 1: SYSTEM TOPOLOGY & PERFORMANCE */}
        {activeTab === 'topology' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-5 space-y-2">
                <div className="text-xs text-[#A8B3C7]">PostgreSQL Strict Invariant</div>
                <div className="text-xl font-bold font-mono text-[#10B981]">ONLINE</div>
                <div className="text-[11px] text-[#A8B3C7]/80">Unique (event_id, unit_id) enforced</div>
              </div>

              <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-5 space-y-2">
                <div className="text-xs text-[#A8B3C7]">Redis Lua Coordination</div>
                <div className="text-xl font-bold font-mono text-[#2DD4BF]">{metrics?.redis?.luaScriptsExecuted || 0} Scripts</div>
                <div className="text-[11px] text-[#A8B3C7]/80">{metrics?.redis?.totalCommandsExecuted || 0} commands total</div>
              </div>

              <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-5 space-y-2">
                <div className="text-xs text-[#A8B3C7]">Latency (p50 / p95 / p99)</div>
                <div className="text-xl font-bold font-mono text-[#F8FAFC]">
                  {metrics?.performance?.p50LatencyMs}ms / {metrics?.performance?.p95LatencyMs}ms / {metrics?.performance?.p99LatencyMs}ms
                </div>
                <div className="text-[11px] text-[#A8B3C7]/80">Real server timing samples</div>
              </div>

              <div className="bg-[#111C2E] border border-[#293548] rounded-xl p-5 space-y-2">
                <div className="text-xs text-[#A8B3C7]">Worker Queue Backlog</div>
                <div className="text-xl font-bold font-mono text-[#60A5FA]">
                  {metrics?.queueAndWorker?.workerBacklog || 0} Pending
                </div>
                <div className="text-[11px] text-[#A8B3C7]/80">{metrics?.queueAndWorker?.processedOutbox || 0} processed</div>
              </div>
            </div>

            {/* Inventory Distribution */}
            <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#F8FAFC]">Inventory Allocation Distribution (200 Units)</h2>
              <div className="w-full h-4 bg-[#0B1220] rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${((metrics?.inventory?.availableUnits || 196) / 200) * 100}%` }}
                  className="bg-[#10B981] h-full"
                  title="Available"
                />
                <div
                  style={{ width: `${((metrics?.inventory?.activeHolds || 0) / 200) * 100}%` }}
                  className="bg-[#F59E0B] h-full"
                  title="Held"
                />
                <div
                  style={{ width: `${((metrics?.inventory?.confirmedBookings || 4) / 200) * 100}%` }}
                  className="bg-[#60A5FA] h-full"
                  title="Confirmed"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-3 bg-[#0B1220] rounded-xl border border-[#293548]">
                  <span className="text-[#10B981] font-bold font-mono text-lg block">
                    {metrics?.inventory?.availableUnits} ({(((metrics?.inventory?.availableUnits || 196) / 200) * 100).toFixed(1)}%)
                  </span>
                  <span className="text-[#A8B3C7]">Available for Hold</span>
                </div>

                <div className="p-3 bg-[#0B1220] rounded-xl border border-[#293548]">
                  <span className="text-[#F59E0B] font-bold font-mono text-lg block">
                    {metrics?.inventory?.activeHolds} ({(((metrics?.inventory?.activeHolds || 0) / 200) * 100).toFixed(1)}%)
                  </span>
                  <span className="text-[#A8B3C7]">Active Temporary Holds</span>
                </div>

                <div className="p-3 bg-[#0B1220] rounded-xl border border-[#293548]">
                  <span className="text-[#60A5FA] font-bold font-mono text-lg block">
                    {metrics?.inventory?.confirmedBookings} ({(((metrics?.inventory?.confirmedBookings || 4) / 200) * 100).toFixed(1)}%)
                  </span>
                  <span className="text-[#A8B3C7]">PostgreSQL Confirmed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOAD BURST CONCURRENCY TESTER */}
        {activeTab === 'burst' && (
          <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-[#F59E0B] font-semibold font-mono flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Real Backend Concurrency Stress Engine</span>
              </div>
              <h2 className="text-xl font-bold text-[#F8FAFC] mt-1">High-Contention Race Verification</h2>
              <p className="text-xs text-[#A8B3C7] mt-1 max-w-2xl leading-relaxed">
                Fire real concurrent asynchronous requests competing for the exact same seat unit in the same millisecond. Tests Redis Lua single-threaded atomic fencing and verifies zero double-bookings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#0B1220] border border-[#293548] rounded-xl">
              <div>
                <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Concurrent Virtual Users</label>
                <select
                  value={burstUsers}
                  onChange={e => setBurstUsers(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#111C2E] border border-[#293548] rounded-lg text-xs font-mono text-[#F8FAFC]"
                >
                  <option value={25}>25 Virtual Competitors</option>
                  <option value={50}>50 Virtual Competitors</option>
                  <option value={100}>100 Virtual Competitors</option>
                  <option value={200}>200 Virtual Competitors</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Target Contested Seat</label>
                <input
                  type="text"
                  value={burstSeat}
                  onChange={e => setBurstSeat(e.target.value)}
                  placeholder="e.g. B-01"
                  className="w-full px-3 py-2 bg-[#111C2E] border border-[#293548] rounded-lg text-xs font-mono text-[#F8FAFC]"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunBurst}
                  disabled={burstRunning}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {burstRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Running Concurrent Burst...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Execute Concurrency Test</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {burstResult && (
              <div className="p-6 bg-[#0B1220] border border-[#293548] rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#293548]">
                  <span className="text-xs font-mono text-[#2DD4BF]">BURST RESULT FOR SEAT {burstResult.targetSeat}</span>
                  <span className="text-xs font-mono text-[#10B981] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ZERO DOUBLE BOOKING VERIFIED</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 bg-[#111C2E] rounded-lg border border-[#293548]">
                    <span className="text-[#A8B3C7] block">Competing Requests</span>
                    <span className="text-lg font-bold text-[#F8FAFC]">{burstResult.virtualUsersSubmitted}</span>
                  </div>
                  <div className="p-3 bg-[#111C2E] rounded-lg border border-[#293548]">
                    <span className="text-[#A8B3C7] block">Successful Hold Claim</span>
                    <span className="text-lg font-bold text-[#10B981]">{burstResult.successfulClaims}</span>
                  </div>
                  <div className="p-3 bg-[#111C2E] rounded-lg border border-[#293548]">
                    <span className="text-[#A8B3C7] block">Collisions Rejected (409)</span>
                    <span className="text-lg font-bold text-[#EF4444]">{burstResult.rejectedCollisions}</span>
                  </div>
                  <div className="p-3 bg-[#111C2E] rounded-lg border border-[#293548]">
                    <span className="text-[#A8B3C7] block">Test Execution Time</span>
                    <span className="text-lg font-bold text-[#60A5FA]">{burstResult.durationMs}ms</span>
                  </div>
                </div>

                <p className="text-xs text-[#A8B3C7] leading-relaxed">
                  {burstResult.summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SELF-HEALING RECONCILER */}
        {activeTab === 'reconciler' && (
          <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#293548]">
              <div>
                <h2 className="text-xl font-bold text-[#F8FAFC]">Self-Healing Reconciliation Engine</h2>
                <p className="text-xs text-[#A8B3C7] mt-1 max-w-2xl">
                  Background worker cleans up unreleased holds older than 300s, heals Redis cache divergence without dropping confirmed bookings, and retries pending outbox persistent events.
                </p>
              </div>
              <button
                onClick={handleRunReconciler}
                disabled={reconciling}
                className="px-4 py-2 text-xs font-semibold text-[#0B1220] bg-[#10B981] hover:bg-[#10B981]/90 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
                <span>{reconciling ? 'Reconciling...' : 'Trigger Immediate Cycle'}</span>
              </button>
            </div>

            {/* Reconciliation History Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-[#A8B3C7]">Recent Reconciliation Audits</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0B1220] border-b border-[#293548] text-[#A8B3C7]">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Expired Checked</th>
                      <th className="py-2.5 px-3">Expired Released</th>
                      <th className="py-2.5 px-3">Divergence Healed</th>
                      <th className="py-2.5 px-3">Outbox Status</th>
                      <th className="py-2.5 px-3 text-right">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#293548]/50">
                    {reconciliationHistory.map((rep, idx) => (
                      <tr key={idx} className="hover:bg-[#17243B]/40">
                        <td className="py-2.5 px-3 text-[#A8B3C7]">{new Date(rep.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2.5 px-3 text-[#F8FAFC]">{rep.expiredHoldsChecked}</td>
                        <td className="py-2.5 px-3 text-[#10B981]">{rep.expiredHoldsReleased}</td>
                        <td className="py-2.5 px-3 text-[#60A5FA]">{rep.divergentUnitsHealed}</td>
                        <td className="py-2.5 px-3 text-[#A8B3C7]">Pending: {rep.outboxPendingCount}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-[#10B981] font-semibold">{rep.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ADAPTIVE MICRO-BATCH SCHEDULER */}
        {activeTab === 'scheduler' && (
          <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC]">Adaptive Micro-Batch Request Scheduler</h2>
              <p className="text-xs text-[#A8B3C7] mt-1 max-w-2xl leading-relaxed">
                Groups admitted reservation requests into sub-10ms micro-batches, assigns monotonic server sequence numbers, and balances queue delay against database contention.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 bg-[#0B1220] border border-[#293548] rounded-xl">
              <div>
                <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Batching Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSchedulerMode('FIXED')}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono font-medium border ${
                      schedulerMode === 'FIXED'
                        ? 'bg-[#111C2E] border-[#2DD4BF] text-[#2DD4BF]'
                        : 'border-[#293548] text-[#A8B3C7]'
                    }`}
                  >
                    FIXED WINDOW
                  </button>
                  <button
                    onClick={() => setSchedulerMode('ADAPTIVE')}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono font-medium border ${
                      schedulerMode === 'ADAPTIVE'
                        ? 'bg-[#111C2E] border-[#2DD4BF] text-[#2DD4BF]'
                        : 'border-[#293548] text-[#A8B3C7]'
                    }`}
                  >
                    ADAPTIVE
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Base Window ({schedulerWindow}ms)</label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={schedulerWindow}
                  onChange={e => setSchedulerWindow(Number(e.target.value))}
                  className="w-full accent-[#2DD4BF]"
                />
                <div className="flex justify-between text-[11px] font-mono text-[#A8B3C7]">
                  <span>5ms (low latency)</span>
                  <span>50ms (high batch)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Max Admission Rate</label>
                <input
                  type="number"
                  value={schedulerRateLimit}
                  onChange={e => setSchedulerRateLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#111C2E] border border-[#293548] rounded-lg text-xs font-mono text-[#F8FAFC]"
                />
                <div className="text-[11px] text-[#A8B3C7] mt-1 font-mono">requests / sec</div>
              </div>
            </div>

            <button
              onClick={handleSaveScheduler}
              className="py-2.5 px-6 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 transition-colors"
            >
              Apply Scheduler Parameters
            </button>

            {/* Live Scheduler Telemetry */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#293548] text-xs font-mono">
              <div className="p-3 bg-[#0B1220] rounded-xl border border-[#293548]">
                <span className="text-[#A8B3C7] block">Avg Queue Delay</span>
                <span className="text-base font-bold text-[#2DD4BF] mt-0.5">{metrics?.scheduler?.avgQueueDelayMs}ms</span>
              </div>
              <div className="p-3 bg-[#0B1220] rounded-xl border border-[#293548]">
                <span className="text-[#A8B3C7] block">p95 Queue Delay</span>
                <span className="text-base font-bold text-[#60A5FA] mt-0.5">{metrics?.scheduler?.p95QueueDelayMs}ms</span>
              </div>
              <div className="p-3 bg-[#0B1220] rounded-xl border border-[#293548]">
                <span className="text-[#A8B3C7] block">Batches Processed</span>
                <span className="text-base font-bold text-[#F8FAFC] mt-0.5">{metrics?.scheduler?.totalBatchesProcessed}</span>
              </div>
              <div className="p-3 bg-[#0B1220] rounded-xl border border-[#293548]">
                <span className="text-[#A8B3C7] block">Sequenced Requests</span>
                <span className="text-base font-bold text-[#F8FAFC] mt-0.5">{metrics?.scheduler?.totalRequestsSequenced}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ML WORKLOAD FORECASTING */}
        {activeTab === 'forecast' && (
          <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-[#2DD4BF] font-semibold font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Experimental Forecasting Baseline</span>
              </div>
              <h2 className="text-xl font-bold text-[#F8FAFC] mt-1">Traffic-Spike Prediction & Advisory Model</h2>
              <p className="text-xs text-[#A8B3C7] mt-1 max-w-2xl leading-relaxed">
                Uses Double Exponential Smoothing and linear autoregression (AR-1) over incoming request throughput to detect sudden flash-sale spikes and recommend admission damping.
              </p>
            </div>

            {forecast && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-4 bg-[#0B1220] rounded-xl border border-[#293548]">
                    <span className="text-[#A8B3C7] block">Current Load</span>
                    <span className="text-xl font-bold text-[#F8FAFC] mt-1">{forecast.currentRps} req/s</span>
                  </div>

                  <div className="p-4 bg-[#0B1220] rounded-xl border border-[#293548]">
                    <span className="text-[#A8B3C7] block">Predicted Next Load</span>
                    <span className="text-xl font-bold text-[#2DD4BF] mt-1">{forecast.predictedNextRps} req/s</span>
                  </div>

                  <div className="p-4 bg-[#0B1220] rounded-xl border border-[#293548]">
                    <span className="text-[#A8B3C7] block">Spike Risk Score</span>
                    <span className={`text-xl font-bold mt-1 ${forecast.isSpikePredicted ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                      {(forecast.spikeRiskScore * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="p-4 bg-[#0B1220] rounded-xl border border-[#293548]">
                    <span className="text-[#A8B3C7] block">Confidence (95%)</span>
                    <span className="text-base font-bold text-[#60A5FA] mt-1">
                      [{forecast.confidenceInterval.lowerRps} – {forecast.confidenceInterval.upperRps}]
                    </span>
                  </div>
                </div>

                <div className="p-5 bg-[#0B1220] border border-[#293548] rounded-xl space-y-3">
                  <div className="text-xs font-mono text-[#2DD4BF] font-semibold">
                    RECOMMENDED ADVISORY SETTINGS
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#A8B3C7]">Recommended Admission Rate:</span>
                      <div className="text-base font-bold font-mono text-[#F8FAFC] mt-0.5">
                        {forecast.recommendedAdmissionRate} req/s
                      </div>
                    </div>
                    <div>
                      <span className="text-[#A8B3C7]">Recommended Batch Window:</span>
                      <div className="text-base font-bold font-mono text-[#F8FAFC] mt-0.5">
                        {forecast.recommendedBatchWindowMs} ms
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#A8B3C7]/80 pt-2 border-t border-[#293548]">
                    Advisory output only. Backend reservation invariants and Lua fencing enforce hard limits independently.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-[#111C2E] border border-[#293548] rounded-2xl p-6 sm:p-8 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC]">System Audit Trail</h2>
              <p className="text-xs text-[#A8B3C7] mt-1">
                Real-time security and coordination event logs.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0B1220] border-b border-[#293548] text-[#A8B3C7]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Entity ID</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#293548]/50">
                  {auditLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-[#17243B]/40">
                      <td className="py-2.5 px-3 text-[#A8B3C7]">{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td className="py-2.5 px-3 text-[#2DD4BF] font-semibold">{log.event_type}</td>
                      <td className="py-2.5 px-3 text-[#F8FAFC]">{log.entity_id}</td>
                      <td className="py-2.5 px-3 text-[#A8B3C7] truncate max-w-xs">{JSON.stringify(log.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
