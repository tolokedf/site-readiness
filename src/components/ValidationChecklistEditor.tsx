import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  FileDown,
  Save,
  ArrowLeft,
  Trash2,
  Upload,
  Plus,
  Compass,
  Wifi,
  Sparkles,
  Layers,
  Calendar,
  User,
  Building,
  Bot,
  AlertTriangle,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  Eye,
  FileCheck,
} from 'lucide-react';
import { SiteReport, ChecklistStatus, ActionItem, ReportAttachment, WifiStatus, MagneticStatus } from '../types';
import { api } from '../services/api';
import { generateSiteReadinessHtml } from '../utils/htmlReportGenerator';
import { CameraCaptureModal } from './CameraCaptureModal';
import { PhotoViewerModal } from './PhotoViewerModal';
import { ReportPreviewModal } from './ReportPreviewModal';

interface ValidationChecklistEditorProps {
  report: SiteReport;
  wifi: WifiStatus;
  magnet: MagneticStatus;
  onSave: (updated: SiteReport) => Promise<void>;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export const ValidationChecklistEditor: React.FC<ValidationChecklistEditorProps> = ({
  report: initialReport,
  wifi,
  magnet,
  onSave,
  onBack,
  onDelete,
}) => {
  const [report, setReport] = useState<SiteReport>(initialReport);
  const [activeSectionId, setActiveSectionId] = useState<string>(
    initialReport?.sections?.[0]?.id || 'network-it'
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingHtml, setGeneratingHtml] = useState(false);

  // File upload & Camera State
  const [uploadingItem, setUploadingItem] = useState<{ sectionId: string; itemNumber: number } | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [activeCameraItem, setActiveCameraItem] = useState<{
    sectionId: string;
    sectionTitle?: string;
    itemNumber: number;
    requirement: string;
  } | null>(null);

  // Photo viewer modal state
  const [viewingPhoto, setViewingPhoto] = useState<ReportAttachment | null>(null);
  const [viewingItemReq, setViewingItemReq] = useState<string | undefined>(undefined);

  // Report preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
      if (initialReport.sections && initialReport.sections.length > 0) {
        setActiveSectionId((prev) => {
          if (prev === 'action-items-view' || prev === 'verification-view') return prev;
          if (initialReport.sections.some((s) => s.id === prev)) return prev;
          return initialReport.sections[0].id;
        });
      }
    }
  }, [initialReport]);

  // Calculate statistics & score
  const stats = useMemo(() => {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let na = 0;
    let pending = 0;

    (report.sections || []).forEach((sec) => {
      (sec.items || []).forEach((item) => {
        total++;
        if (item.status === 'PASS') passed++;
        else if (item.status === 'FAIL') failed++;
        else if (item.status === 'NA') na++;
        else pending++;
      });
    });

    const applicable = total - na;
    const score = applicable > 0 ? Math.round((passed / applicable) * 100) : 0;
    const totalPhotos = (report.attachments || []).length;

    return { total, passed, failed, na, pending, score, totalPhotos };
  }, [report]);

  const handleStatusChange = (sectionId: string, itemNumber: number, status: ChecklistStatus) => {
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((item) => {
            if (item.number !== itemNumber) return item;
            return { ...item, status };
          }),
        };
      }),
    }));
  };

  const handleRemarkChange = (sectionId: string, itemNumber: number, userRemark: string) => {
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((item) => {
            if (item.number !== itemNumber) return item;
            return { ...item, userRemark };
          }),
        };
      }),
    }));
  };

  const insertWifiTelemetry = (sectionId: string, itemNumber: number) => {
    const text = `Live RSSI: ${wifi.estimatedDbm} dBm, Latency: ${wifi.lastPingMs || wifi.rtt}ms, Downlink: ${wifi.downlink}Mbps (${wifi.quality} Coverage - Pass FRM requirement)`;
    handleRemarkChange(sectionId, itemNumber, text);
    handleStatusChange(sectionId, itemNumber, wifi.estimatedDbm >= -65 ? 'PASS' : 'FAIL');
  };

  const insertMagnetTelemetry = (sectionId: string, itemNumber: number) => {
    if (magnet.available && magnet.magnitudeUt !== null) {
      const text = `Live Magnetic Field: ${magnet.magnitudeUt.toFixed(1)} µT (X:${magnet.x ?? 0}, Y:${magnet.y ?? 0}, Z:${magnet.z ?? 0}). Assessment: ${magnet.anomalyLevel} ambient baseline - ${magnet.anomalyLevel === 'Normal' ? 'Safe for IMU.' : 'Check for magnetic interference.'}`;
      handleRemarkChange(sectionId, itemNumber, text);
      handleStatusChange(sectionId, itemNumber, magnet.anomalyLevel === 'Normal' ? 'PASS' : 'FAIL');
    } else {
      const text = `Magnetic Field Survey: No hardware magnetic sensor detected on inspector device.`;
      handleRemarkChange(sectionId, itemNumber, text);
    }
  };

  const handleQuickBatch = (sectionId: string, status: ChecklistStatus) => {
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((item) => ({ ...item, status })),
        };
      }),
    }));
  };

  // Action Items Management
  const handleAddActionItem = () => {
    const newItem: ActionItem = {
      id: 'act_' + Date.now(),
      number: (report.actionItems?.length || 0) + 1,
      actionItem: '',
      pic: '',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Open',
    };
    setReport((prev) => ({
      ...prev,
      actionItems: [...(prev.actionItems || []), newItem],
    }));
  };

  const handleUpdateActionItem = (id: string, field: keyof ActionItem, value: any) => {
    setReport((prev) => ({
      ...prev,
      actionItems: (prev.actionItems || []).map((act) => (act.id === id ? { ...act, [field]: value } : act)),
    }));
  };

  const handleDeleteActionItem = (id: string) => {
    setReport((prev) => ({
      ...prev,
      actionItems: (prev.actionItems || []).filter((act) => act.id !== id),
    }));
  };

  // Camera Capture Modal Trigger
  const handleOpenCameraModal = (sectionId: string, sectionTitle: string, itemNumber: number, requirement: string) => {
    setActiveCameraItem({ sectionId, sectionTitle, itemNumber, requirement });
    setCameraModalOpen(true);
  };

  // Process photo captured from live camera
  const handleCapturePhoto = async (file: File, caption?: string) => {
    if (!activeCameraItem) return;
    try {
      const res = await api.uploadAttachments(
        report.id,
        [file],
        activeCameraItem.sectionId,
        activeCameraItem.itemNumber,
        caption
      );
      if (res.report) {
        setReport(res.report);
      }
    } catch (err) {
      console.error('Failed uploading camera photo', err);
      throw err;
    }
  };

  // File Upload Trigger
  const handleTriggerUpload = (sectionId: string, itemNumber: number) => {
    setUploadingItem({ sectionId, itemNumber });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !uploadingItem) return;
    const files = Array.from(e.target.files) as File[];

    try {
      const res = await api.uploadAttachments(
        report.id,
        files,
        uploadingItem.sectionId,
        uploadingItem.itemNumber
      );
      if (res.report) {
        setReport(res.report);
      }
    } catch (err) {
      console.error('Failed to upload evidence files', err);
      alert('Failed to upload site evidence image.');
    } finally {
      setUploadingItem(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await api.deleteAttachment(report.id, attachmentId);
      if (res.report) {
        setReport(res.report);
      }
    } catch (err) {
      console.error('Failed to delete attachment', err);
    }
  };

  // Save Report
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(report);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save report', err);
      alert('Failed to save checklist report.');
    } finally {
      setSaving(false);
    }
  };

  // Generate & Download HTML with Photos
  const handleDownloadHtml = async () => {
    setGeneratingHtml(true);
    try {
      await generateSiteReadinessHtml(report);
    } catch (err) {
      console.error('Failed generating HTML report', err);
      alert('Failed to generate site readiness HTML report.');
    } finally {
      setGeneratingHtml(false);
    }
  };

  const activeSection =
    (report?.sections || []).find((s) => s.id === activeSectionId) || report?.sections?.[0];

  return (
    <div id="validation-editor-view" className="space-y-6 pb-16">
      {/* Hidden File Input for Multiple Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => {
          setCameraModalOpen(false);
          setActiveCameraItem(null);
        }}
        onCapture={handleCapturePhoto}
        itemInfo={activeCameraItem}
      />

      {/* Photo Lightbox / Zoom Modal */}
      <PhotoViewerModal
        isOpen={!!viewingPhoto}
        photo={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        onDelete={handleDeleteAttachment}
        itemRequirement={viewingItemReq}
      />

      {/* Full Report Preview Modal */}
      <ReportPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        report={report}
      />

      {/* Top Breadcrumb & Action Bar */}
      <div className="bg-white rounded-[2.5rem] p-5 sm:p-6 border border-[#E0F2F1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="back-to-dashboard-btn"
            onClick={onBack}
            className="p-2.5 text-slate-500 hover:text-[#00796B] hover:bg-[#E0F2F1] rounded-2xl border border-[#E0F2F1] transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#00695C] bg-[#E0F2F1] border border-[#B2DFDB] px-2.5 py-0.5 rounded-full">
                FRM-FLD-003
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-[#004D40] tracking-tight">
                {report.projectTitle || 'Site Readiness Verification'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Site: {report.siteName} • Conducted By: {report.conductedBy} • Date: {report.date}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            id="preview-report-btn"
            onClick={() => setPreviewModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F4FAF9] hover:bg-[#E0F2F1] text-[#00695C] border border-[#B2DFDB] rounded-2xl text-xs font-bold shadow-xs transition-colors"
          >
            <Eye className="w-4 h-4 text-[#00796B]" />
            <span>Preview Report</span>
          </button>

          <button
            id="download-html-btn"
            onClick={handleDownloadHtml}
            disabled={generatingHtml}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F4FAF9] text-slate-700 border border-[#E0F2F1] rounded-2xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 text-[#00796B]" />
            <span>{generatingHtml ? 'Embedding Photos...' : 'Export HTML'}</span>
          </button>

          <button
            id="save-report-btn"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00796B] hover:bg-[#00695C] text-white rounded-2xl text-xs font-bold shadow-md shadow-[#00796B]/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Progress'}</span>
          </button>

          <button
            id="delete-report-top-btn"
            onClick={() => onDelete(report.id)}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl border border-[#E0F2F1] transition-colors"
            title="Delete this testing report"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Meta Card & Live Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Project Header Info Form */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-5 sm:p-6 border border-[#E0F2F1] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E0F2F1]">
            <h3 className="font-bold text-[#004D40] text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-[#00796B]" />
              <span>Project & Facility Deployment Parameters</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">FRM-FLD-003 Standard</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Project Title</label>
              <input
                id="input-project-title"
                type="text"
                value={report.projectTitle}
                onChange={(e) => setReport({ ...report, projectTitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                placeholder="e.g. Semiconductor Cleanroom Phase 2"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Site / Facility Name</label>
              <input
                id="input-site-name"
                type="text"
                value={report.siteName}
                onChange={(e) => setReport({ ...report, siteName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                placeholder="e.g. Customer Plant B - Line 4"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Conducted By (Engineer)</label>
              <input
                id="input-conducted-by"
                type="text"
                value={report.conductedBy}
                onChange={(e) => setReport({ ...report, conductedBy: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                placeholder="e.g. Field Engineer Name"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">AMR / AGV Model</label>
              <input
                id="input-amr-model"
                type="text"
                value={report.amrModel}
                onChange={(e) => setReport({ ...report, amrModel: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                placeholder="e.g. Titan T1000 / Navios 500"
              />
            </div>
          </div>
        </div>

        {/* Live Compliance & Photos Score Widget */}
        <div className="bg-gradient-to-br from-[#004D40] to-[#00796B] text-white rounded-[2.5rem] p-6 shadow-md shadow-[#00796B]/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#E0F2F1] uppercase tracking-wider">
              Site Readiness Score
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs">
              {stats.score >= 85 ? 'DEPLOYMENT READY' : stats.score >= 60 ? 'CONDITIONAL' : 'ACTION REQUIRED'}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black">{stats.score}%</span>
            <span className="text-xs text-[#E0F2F1]/80 font-medium">Compliance Index</span>
          </div>

          {/* Mini Status Breakdown Pills */}
          <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-white/15 text-center">
            <div className="bg-white/10 rounded-2xl p-1.5 backdrop-blur-xs">
              <span className="block text-xs font-extrabold text-[#A7F3D0]">{stats.passed}</span>
              <span className="text-[10px] text-[#E0F2F1]/80 font-medium">Pass</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-1.5 backdrop-blur-xs">
              <span className="block text-xs font-extrabold text-[#FECDD3]">{stats.failed}</span>
              <span className="text-[10px] text-[#E0F2F1]/80 font-medium">Fail</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-1.5 backdrop-blur-xs">
              <span className="block text-xs font-extrabold text-amber-200">{stats.pending}</span>
              <span className="text-[10px] text-[#E0F2F1]/80 font-medium">Pending</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-1.5 backdrop-blur-xs">
              <span className="block text-xs font-extrabold text-[#E0F2F1]">{stats.totalPhotos}</span>
              <span className="text-[10px] text-[#E0F2F1]/80 font-medium">Photos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Section Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {report.sections.map((section, index) => {
          const isActive = section.id === activeSectionId;
          const secPassed = section.items.filter((i) => i.status === 'PASS').length;
          const secFailed = section.items.filter((i) => i.status === 'FAIL').length;
          const secPhotos = (report.attachments || []).filter((a) => a.sectionId === section.id).length;

          return (
            <button
              key={section.id}
              id={`tab-section-${section.id}`}
              onClick={() => setActiveSectionId(section.id)}
              className={`px-4 py-3 rounded-2xl text-xs font-bold shrink-0 transition-all border flex items-center gap-2.5 ${
                isActive
                  ? 'bg-[#00796B] text-white border-[#00796B] shadow-md shadow-[#00796B]/20'
                  : 'bg-white text-slate-600 border-[#E0F2F1] hover:bg-[#F4FAF9] hover:text-[#004D40]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#E0F2F1] text-[#00695C]'
                }`}
              >
                {index + 1}
              </span>
              <span className="truncate max-w-[160px] sm:max-w-none">{section.title}</span>
              <div className="flex items-center gap-1 text-[10px] opacity-85">
                <span className={secFailed > 0 ? 'text-rose-300 font-bold' : ''}>
                  {secPassed}/{section.items.length}
                </span>
                {secPhotos > 0 && (
                  <span className="bg-black/20 px-1.5 py-0.2 rounded-full text-[9px]">
                    📸 {secPhotos}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Action Items Tab */}
        <button
          id="tab-section-action-items"
          onClick={() => setActiveSectionId('action-items-view')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold shrink-0 transition-all border flex items-center gap-2 ${
            activeSectionId === 'action-items-view'
              ? 'bg-[#00796B] text-white border-[#00796B] shadow-md shadow-[#00796B]/20'
              : 'bg-white text-slate-600 border-[#E0F2F1] hover:bg-[#F4FAF9]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Action Items ({report.actionItems?.length || 0})</span>
        </button>

        {/* Verification & Sign-off Tab */}
        <button
          id="tab-section-verification"
          onClick={() => setActiveSectionId('verification-view')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold shrink-0 transition-all border flex items-center gap-2 ${
            activeSectionId === 'verification-view'
              ? 'bg-[#00796B] text-white border-[#00796B] shadow-md shadow-[#00796B]/20'
              : 'bg-white text-slate-600 border-[#E0F2F1] hover:bg-[#F4FAF9]'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Sign-off & Report</span>
        </button>
      </div>

      {/* Active Section Checklist Content */}
      {activeSection && activeSectionId !== 'action-items-view' && activeSectionId !== 'verification-view' && (
        <div className="bg-white rounded-[2.5rem] border border-[#E0F2F1] shadow-xs overflow-hidden">
          {/* Section Header with Quick Actions */}
          <div className="p-5 sm:p-6 bg-[#F4FAF9] border-b border-[#E0F2F1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#004D40] flex items-center gap-2">
                <span>{activeSection.title}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Verify each requirement. Attach none, one, or multiple photos per remark as visual evidence.
              </p>
            </div>

            {/* Batch status buttons */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-[11px] font-bold text-slate-400 mr-1 hidden md:inline">Quick Batch:</span>
              <button
                onClick={() => handleQuickBatch(activeSection.id, 'PASS')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                Pass All
              </button>
              <button
                onClick={() => handleQuickBatch(activeSection.id, 'NA')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                N/A All
              </button>
              <button
                onClick={() => handleQuickBatch(activeSection.id, 'PENDING')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#FFF3E0] text-[#E65100] hover:bg-[#FFE0B2] border border-[#FFE0B2] transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Checklist Items List */}
          <div className="divide-y divide-[#E0F2F1]">
            {activeSection.items.map((item) => {
              const isWifiItem = activeSection.id === 'network-it' && item.number === 1;
              const isMagnetItem = activeSection.id === 'amr-navigation' && item.number === 4;
              const itemAttachments = (report.attachments || []).filter(
                (att) => att.sectionId === activeSection.id && att.itemNumber === item.number
              );

              return (
                <div
                  key={item.number}
                  id={`item-${activeSection.id}-${item.number}`}
                  className={`p-5 sm:p-6 transition-colors ${
                    item.status === 'FAIL'
                      ? 'bg-rose-50/30'
                      : item.status === 'PASS'
                      ? 'hover:bg-[#F4FAF9]/40'
                      : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Item Requirement & Description */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-xl bg-[#E0F2F1] text-[#00695C] font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {item.number}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-snug">
                            {item.requirement}
                          </p>
                          {item.remarkRequirement && (
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {item.remarkRequirement}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Sensor Shortcut buttons (if applicable) */}
                      {isWifiItem && (
                        <div className="ml-10 flex items-center gap-2">
                          <button
                            id="insert-wifi-reading-btn"
                            onClick={() => insertWifiTelemetry(activeSection.id, item.number)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#E0F2F1] text-[#00695C] hover:bg-[#B2DFDB] border border-[#B2DFDB] text-xs font-bold transition-colors"
                          >
                            <Wifi className="w-3.5 h-3.5 text-[#00796B]" />
                            <span>Capture Live Wi-Fi Telemetry ({wifi.estimatedDbm} dBm)</span>
                          </button>
                        </div>
                      )}

                      {isMagnetItem && (
                        <div className="ml-10 flex items-center gap-2">
                          <button
                            id="insert-mag-reading-btn"
                            onClick={() => insertMagnetTelemetry(activeSection.id, item.number)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-colors ${
                              magnet.available && magnet.magnitudeUt !== null
                                ? 'bg-[#E0F2F1] text-[#00695C] hover:bg-[#B2DFDB] border-[#B2DFDB]'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                            }`}
                          >
                            <Compass className="w-3.5 h-3.5 text-[#00796B]" />
                            <span>
                              {magnet.available && magnet.magnitudeUt !== null
                                ? `Capture Live Magnetic Field (${magnet.magnitudeUt.toFixed(1)} μT - ${magnet.anomalyLevel})`
                                : 'Record: No Magnetic Sensor Detected'}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Optional Remark Text Box & Photo Action Row */}
                      <div className="ml-10 space-y-2.5 pt-1">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-500">
                              Inspector Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <span className="text-[10px] text-slate-400">
                              {itemAttachments.length === 0
                                ? 'No photos attached (optional)'
                                : `${itemAttachments.length} photo${itemAttachments.length > 1 ? 's' : ''} attached`}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={item.userRemark}
                            onChange={(e) =>
                              handleRemarkChange(activeSection.id, item.number, e.target.value)
                            }
                            placeholder="Optional: Add field remarks, measured clearances, or leave empty..."
                            className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                          />
                        </div>

                        {/* Photo Action Bar for this Remark/Item */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* Live Camera Snapshot Button */}
                          <button
                            type="button"
                            id={`btn-camera-${activeSection.id}-${item.number}`}
                            onClick={() =>
                              handleOpenCameraModal(
                                activeSection.id,
                                activeSection.title,
                                item.number,
                                item.requirement
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#E0F2F1] hover:bg-[#B2DFDB] text-[#00695C] text-xs font-bold border border-[#B2DFDB] transition-all shadow-xs"
                            title="Take a live photo using camera for this remark"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#00796B]" />
                            <span>Take Photo</span>
                          </button>

                          {/* Upload Photos Button (Multiple) */}
                          <button
                            type="button"
                            id={`btn-upload-${activeSection.id}-${item.number}`}
                            onClick={() => handleTriggerUpload(activeSection.id, item.number)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-[#F4FAF9] text-slate-700 text-xs font-bold border border-[#E0F2F1] transition-all"
                            title="Select one or multiple photos from device"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span>Upload Photos</span>
                          </button>
                        </div>

                        {/* Attached Photos Thumbnail Gallery for this Item */}
                        {itemAttachments.length > 0 && (
                          <div className="pt-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                              {itemAttachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="group relative rounded-2xl overflow-hidden border border-[#E0F2F1] bg-slate-900 shadow-xs aspect-video flex items-center justify-center"
                                >
                                  <img
                                    src={att.url}
                                    alt={att.caption || att.originalName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />

                                  {/* Overlay on hover */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewingPhoto(att);
                                        setViewingItemReq(item.requirement);
                                      }}
                                      className="p-1.5 rounded-xl bg-white/20 hover:bg-white/40 text-white transition-colors"
                                      title="View photo full size"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAttachment(att.id)}
                                      className="p-1.5 rounded-xl bg-rose-500/60 hover:bg-rose-500 text-white transition-colors"
                                      title="Delete this photo"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Caption Pill */}
                                  {att.caption && (
                                    <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[9px] text-white truncate text-center pointer-events-none">
                                      {att.caption}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-2 self-start shrink-0 pt-1 lg:pt-0">
                      <div className="flex items-center p-1 bg-[#F4FAF9] rounded-2xl border border-[#E0F2F1]">
                        <button
                          id={`btn-pass-${activeSection.id}-${item.number}`}
                          onClick={() => handleStatusChange(activeSection.id, item.number, 'PASS')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            item.status === 'PASS'
                              ? 'bg-[#00796B] text-white shadow-xs'
                              : 'text-slate-600 hover:text-[#00796B]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PASS</span>
                        </button>

                        <button
                          id={`btn-fail-${activeSection.id}-${item.number}`}
                          onClick={() => handleStatusChange(activeSection.id, item.number, 'FAIL')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            item.status === 'FAIL'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-rose-600'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>FAIL</span>
                        </button>

                        <button
                          id={`btn-na-${activeSection.id}-${item.number}`}
                          onClick={() => handleStatusChange(activeSection.id, item.number, 'NA')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            item.status === 'NA'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                          <span>N/A</span>
                        </button>

                        <button
                          id={`btn-pending-${activeSection.id}-${item.number}`}
                          onClick={() => handleStatusChange(activeSection.id, item.number, 'PENDING')}
                          className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            item.status === 'PENDING'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-amber-700'
                          }`}
                          title="Pending Review"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section Footer Next / Prev */}
          <div className="p-5 bg-[#F4FAF9] border-t border-[#E0F2F1] flex justify-between items-center">
            <button
              onClick={() => {
                if (!activeSection || !report.sections) return;
                const curIdx = report.sections.findIndex((s) => s.id === activeSection.id);
                if (curIdx > 0) setActiveSectionId(report.sections[curIdx - 1].id);
              }}
              disabled={!activeSection || !report.sections || report.sections.findIndex((s) => s.id === activeSection.id) <= 0}
              className="px-4 py-2.5 text-xs font-bold rounded-2xl border border-[#E0F2F1] bg-white text-slate-700 hover:bg-[#F4FAF9] disabled:opacity-30 transition-colors"
            >
              Previous Section
            </button>

            <button
              onClick={() => {
                if (!activeSection || !report.sections) return;
                const curIdx = report.sections.findIndex((s) => s.id === activeSection.id);
                if (curIdx >= 0 && curIdx < report.sections.length - 1) {
                  setActiveSectionId(report.sections[curIdx + 1].id);
                } else {
                  setActiveSectionId('action-items-view');
                }
              }}
              className="px-5 py-2.5 text-xs font-bold rounded-2xl bg-[#00796B] hover:bg-[#00695C] text-white flex items-center gap-2 shadow-md shadow-[#00796B]/20 transition-all"
            >
              <span>Next Section</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action Items View */}
      {activeSectionId === 'action-items-view' && (
        <div className="bg-white rounded-[2.5rem] border border-[#E0F2F1] shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#004D40] text-lg">Site Action Items & Outstanding Tasks</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track follow-up rectifications required by customer facility or DF engineers.
              </p>
            </div>
            <button
              id="add-action-item-btn"
              onClick={handleAddActionItem}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00796B] hover:bg-[#00695C] text-white rounded-2xl text-xs font-bold shadow-md shadow-[#00796B]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Action Item</span>
            </button>
          </div>

          {(!report.actionItems || report.actionItems.length === 0) ? (
            <div className="text-center py-12 border-2 border-dashed border-[#E0F2F1] rounded-3xl bg-[#F4FAF9]/40">
              <CheckCircle2 className="w-10 h-10 text-[#00796B] mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-700">No action items recorded</p>
              <p className="text-xs text-slate-400 mt-1">
                Click the button above if any site modifications are needed before deployment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#E0F2F1] rounded-2xl overflow-hidden">
                <thead className="bg-[#F4FAF9] text-[#00695C] font-bold border-b border-[#E0F2F1]">
                  <tr>
                    <th className="p-3.5 w-12 text-center">No.</th>
                    <th className="p-3.5">Action Item / Task</th>
                    <th className="p-3.5 w-48">Person In Charge (PIC)</th>
                    <th className="p-3.5 w-36">Due Date</th>
                    <th className="p-3.5 w-32">Status</th>
                    <th className="p-3.5 w-16 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0F2F1]">
                  {report.actionItems.map((act, index) => (
                    <tr key={act.id} className="hover:bg-[#F4FAF9]/50">
                      <td className="p-3.5 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={act.actionItem}
                          onChange={(e) => handleUpdateActionItem(act.id, 'actionItem', e.target.value)}
                          placeholder="Describe action required..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E0F2F1] focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={act.pic}
                          onChange={(e) => handleUpdateActionItem(act.id, 'pic', e.target.value)}
                          placeholder="PIC / Department"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E0F2F1] focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={act.dueDate}
                          onChange={(e) => handleUpdateActionItem(act.id, 'dueDate', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E0F2F1] focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={act.status}
                          onChange={(e) => handleUpdateActionItem(act.id, 'status', e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-xs rounded-xl border font-bold ${
                            act.status === 'Closed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : act.status === 'In Progress'
                              ? 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteActionItem(act.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Verification & Sign-off View */}
      {activeSectionId === 'verification-view' && (
        <div className="space-y-6">
          {/* Main Sign-off Card */}
          <div className="bg-white rounded-[2.5rem] border border-[#E0F2F1] shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-bold text-[#004D40] text-lg">Verification & Sign-off (FRM-FLD-003)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Final sign-off by Lead Commissioning Engineer and verification summary.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Verified By (Lead Engineer)</label>
                  <input
                    id="input-verified-by"
                    type="text"
                    value={report.verifiedBy}
                    onChange={(e) => setReport({ ...report, verifiedBy: e.target.value })}
                    placeholder="e.g. Ir. Tan Kah Seng / Senior Deployment Specialist"
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Verification Date</label>
                  <input
                    id="input-verification-date"
                    type="date"
                    value={report.verificationDate || report.date}
                    onChange={(e) => setReport({ ...report, verificationDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Verifier Designation</label>
                  <input
                    id="input-verifier-designation"
                    type="text"
                    value={report.verifierDesignation || ''}
                    onChange={(e) => setReport({ ...report, verifierDesignation: e.target.value })}
                    placeholder="e.g. DF Automation Lead Field Engineer"
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Final Site Verdict</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { val: 'READY', label: 'Ready for Deployment' },
                      { val: 'CONDITIONAL', label: 'Conditional Pass' },
                      { val: 'ACTION_REQUIRED', label: 'Action Required' },
                      { val: 'NOT_READY', label: 'Not Ready' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setReport({ ...report, overallStatus: opt.val as any })}
                        className={`p-3.5 rounded-2xl text-left border text-xs font-bold transition-all ${
                          report.overallStatus === opt.val
                            ? 'bg-[#00796B] text-white border-[#00796B] shadow-sm'
                            : 'bg-[#F4FAF9] text-slate-700 border-[#E0F2F1] hover:bg-[#E0F2F1]/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Audit Notes & Recommendations</label>
                  <textarea
                    rows={3}
                    value={report.notes || ''}
                    onChange={(e) => setReport({ ...report, notes: e.target.value })}
                    placeholder="Summary of recommendations, safety clearances, and readiness timeline..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                  />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-5 border-t border-[#E0F2F1] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#F4FAF9] hover:bg-[#E0F2F1] text-[#00695C] border border-[#B2DFDB] rounded-2xl text-xs font-bold transition-colors"
                >
                  <Eye className="w-4 h-4 text-[#00796B]" />
                  <span>Preview Full Report with Photos</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  disabled={generatingHtml}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4 text-[#4DB6AC]" />
                  <span>{generatingHtml ? 'Building HTML Report...' : 'Export Official HTML (FRM-FLD-003)'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00796B] hover:bg-[#00695C] text-white rounded-2xl text-xs font-bold shadow-md shadow-[#00796B]/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save & Complete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
