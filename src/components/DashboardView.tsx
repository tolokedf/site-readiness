import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  FileText,
  FileDown,
  Trash2,
  Building,
  Paperclip,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { SiteReport, WifiStatus, MagneticStatus } from '../types';
import { WifiCard } from './WifiCard';
import { MagnetometerCard } from './MagnetometerCard';
import { generateSiteReadinessHtml } from '../utils/htmlReportGenerator';

interface DashboardViewProps {
  reports: SiteReport[];
  wifi: WifiStatus;
  magnet: MagneticStatus;
  loading: boolean;
  creating?: boolean;
  onNewReport: () => void;
  onOpenReport: (report: SiteReport) => void;
  onDeleteReport: (id: string) => void;
  onRefreshWifi: () => void;
  onRunWifiSurvey: () => Promise<any>;
  onSimulateWifi: (dbm: number) => void;
  onRequestMagPermission: () => void;
  onRedetectMag?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  wifi,
  magnet,
  loading,
  creating = false,
  onNewReport,
  onOpenReport,
  onDeleteReport,
  onRefreshWifi,
  onRunWifiSurvey,
  onSimulateWifi,
  onRequestMagPermission,
  onRedetectMag,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch =
        r.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.conductedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.amrModel || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || r.overallStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  // Overall Stats
  const stats = useMemo(() => {
    const total = reports.length;
    const ready = reports.filter((r) => r.overallStatus === 'READY').length;
    const conditional = reports.filter((r) => r.overallStatus === 'CONDITIONAL').length;
    const actionRequired = reports.filter(
      (r) => r.overallStatus === 'ACTION_REQUIRED' || r.overallStatus === 'NOT_READY'
    ).length;

    let totalScore = 0;
    reports.forEach((r) => {
      let passed = 0;
      let totalItems = 0;
      r.sections.forEach((s) => {
        s.items.forEach((i) => {
          totalItems++;
          if (i.status === 'PASS') passed++;
        });
      });
      if (totalItems > 0) totalScore += (passed / totalItems) * 100;
    });
    const avgScore = total > 0 ? Math.round(totalScore / total) : 0;

    return { total, ready, conditional, actionRequired, avgScore };
  }, [reports]);

  return (
    <div id="dashboard-main-view" className="space-y-8 pb-16">
      {/* Natural Tones Hero / Readiness Suite Launch Banner */}
      <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 border border-[#E0F2F1] shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8">
        {/* Subtle decorative background watermark */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none hidden lg:block">
          <ShieldCheck className="w-80 h-80 text-[#00796B]" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 max-w-2xl">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#E0F2F1] rounded-full flex items-center justify-center text-[#00796B] shrink-0 shadow-inner">
            <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#E0F2F1] text-[#00695C] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-[#00796B] rounded-full"></span>
              <span>FRM-FLD-003 Standard</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#004D40] tracking-tight">
              Ready for Site Validation?
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Initialize the site readiness protocol to verify automation paths, Wi-Fi coverage,
              magnetic flux tolerances, and safety clearance zones.
            </p>
          </div>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            id="start-validation-btn"
            onClick={onNewReport}
            disabled={creating}
            className="w-full sm:w-auto bg-[#00796B] hover:bg-[#00695C] disabled:bg-[#00796B]/70 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-[#00796B]/20 hover:scale-[1.02] disabled:scale-100 transition-all flex items-center justify-center gap-3 group"
          >
            {creating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Initializing Audit Protocol...</span>
              </>
            ) : (
              <>
                <span>Launch Validation Suite</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Sensors Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#00695C]">
            Live Environment & Telemetry Diagnostics
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Continuous hardware monitoring</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WifiCard
            wifi={wifi}
            onRefresh={onRefreshWifi}
            onRunSurvey={onRunWifiSurvey}
            onSimulate={onSimulateWifi}
          />
          <MagnetometerCard
            magnet={magnet}
            onRequestPermission={onRequestMagPermission}
            onRedetect={onRedetectMag}
          />
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-[2rem] p-5 border border-[#E0F2F1] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Audits
          </span>
          <span className="text-3xl font-light text-[#004D40] tracking-tight mt-1.5 block">
            {stats.total}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">FRM-FLD-003 reports</span>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-[#E0F2F1] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
            Ready to Deploy
          </span>
          <span className="text-3xl font-light text-emerald-600 tracking-tight mt-1.5 block">
            {stats.ready}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">100% compliant facilities</span>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-[#E0F2F1] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
            Conditional Pass
          </span>
          <span className="text-3xl font-light text-amber-600 tracking-tight mt-1.5 block">
            {stats.conditional}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Action items open</span>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-[#E0F2F1] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#00695C] block">
            Readiness Avg
          </span>
          <span className="text-3xl font-light text-[#004D40] tracking-tight mt-1.5 block">
            {stats.avgScore}%
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Fleet average compliance</span>
        </div>
      </div>

      {/* Reports Section & Filters */}
      <div className="bg-white rounded-[2.5rem] border border-[#E0F2F1] shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Site Reports</h2>
            <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Generated Readiness Documentation
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-reports-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search project or site..."
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
              />
            </div>

            {/* Filter Select */}
            <select
              id="filter-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">Ready</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="ACTION_REQUIRED">Action Required</option>
              <option value="NOT_READY">Not Ready</option>
            </select>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading site reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[#E0F2F1] rounded-3xl space-y-4 bg-[#F4FAF9]/30">
            <div className="w-14 h-14 rounded-2xl bg-[#E0F2F1] text-[#00796B] flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">No validation reports found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Try adjusting your search query or status filter.'
                  : 'Start your first Site Readiness Verification Checklist for an AMR deployment.'}
              </p>
            </div>
            <button
              onClick={onNewReport}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#00796B] hover:bg-[#00695C] disabled:bg-[#00796B]/70 text-white text-xs font-bold rounded-2xl shadow-md shadow-[#00796B]/20 transition-all"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Report...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create First Report</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReports.map((report) => {
              // Calculate specific report stats
              let passed = 0;
              let failed = 0;
              let total = 0;
              report.sections.forEach((s) => {
                s.items.forEach((i) => {
                  total++;
                  if (i.status === 'PASS') passed++;
                  else if (i.status === 'FAIL') failed++;
                });
              });
              const score = total > 0 ? Math.round((passed / total) * 100) : 0;
              const attachmentsCount = report.attachments?.length || 0;

              return (
                <div
                  key={report.id}
                  id={`report-card-${report.id}`}
                  className="bg-[#F4FAF9]/50 rounded-[2rem] border border-transparent hover:border-[#4DB6AC] hover:bg-white hover:shadow-md transition-all p-6 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-[#E0F2F1] text-[#00695C]">
                        FRM-FLD-003
                      </span>

                      <span
                        className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full border ${
                          report.overallStatus === 'READY'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : report.overallStatus === 'CONDITIONAL'
                            ? 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {report.overallStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-[#00695C] transition-colors">
                        {report.projectTitle}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{report.siteName}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white/80 p-3 rounded-2xl border border-[#E0F2F1]">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-medium">AMR Model:</span>
                        <strong className="text-slate-800 font-bold">{report.amrModel || 'DFleet Standard'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-medium">Date:</span>
                        <strong className="text-slate-800 font-bold">{report.date}</strong>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                        <span>Compliance Score</span>
                        <span className="text-[#004D40] font-bold">{score}% ({passed}/{total})</span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-[#4DB6AC] rounded-full transition-all duration-500"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    {attachmentsCount > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#00695C] font-semibold">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{attachmentsCount} evidence file(s) attached</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 mt-5 border-t border-[#E0F2F1] flex items-center justify-between gap-2">
                    <button
                      id={`open-report-${report.id}-btn`}
                      onClick={() => onOpenReport(report)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 bg-[#00796B] hover:bg-[#00695C] text-white rounded-2xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <span>Open Checklist</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`download-html-${report.id}-btn`}
                      onClick={() => generateSiteReadinessHtml(report)}
                      className="p-2.5 text-slate-500 hover:text-[#00796B] hover:bg-[#E0F2F1] rounded-2xl border border-[#E0F2F1] transition-colors"
                      title="Export HTML Checklist (FRM-FLD-003)"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>

                    <button
                      id={`delete-report-${report.id}-btn`}
                      onClick={() => onDeleteReport(report.id)}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl border border-[#E0F2F1] transition-colors"
                      title="Delete this report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Natural Tones Encrypted banner at bottom */}
        <div className="p-2 pt-4">
          <div className="bg-[#F4FAF9] p-5 rounded-3xl flex gap-4 items-start border border-[#E0F2F1]">
            <Info className="w-5 h-5 text-[#00796B] shrink-0 mt-0.5" />
            <p className="text-xs text-[#00695C] leading-relaxed font-medium">
              Site readiness reports are encrypted and structured according to the DF Automation &
              Robotics FRM-FLD-003 specification. Only authorized field engineers can modify or delete testing history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

