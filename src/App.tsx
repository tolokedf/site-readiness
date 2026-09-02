import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { ValidationChecklistEditor } from './components/ValidationChecklistEditor';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { useWifiMonitor } from './hooks/useWifiMonitor';
import { useMagnetometer } from './hooks/useMagnetometer';
import { SiteReport } from './types';
import { api } from './services/api';
import { DEFAULT_CHECKLIST_SECTIONS } from './data/checklistTemplate';

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const { wifi, refreshWifi, runDetailedSurvey, simulateValue } = useWifiMonitor(4000);
  const { status: magnet, requestIosPermission, redetect: redetectMag } = useMagnetometer();

  const [reports, setReports] = useState<SiteReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [creatingReport, setCreatingReport] = useState(false);
  const [activeReport, setActiveReport] = useState<SiteReport | null>(null);
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');

  // Deletion modal state
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoadingReports(true);
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoadingReports(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchReports();
    } else {
      setReports([]);
      setActiveReport(null);
      setView('dashboard');
    }
  }, [user?.id, fetchReports]);

  // Handler to start new validation
  const handleStartNewReport = async () => {
    if (!user || creatingReport) return;
    setCreatingReport(true);

    const newReportTemplate: Partial<SiteReport> = {
      projectTitle: 'New Site AMR Readiness Audit',
      siteName: user.organization || 'Customer Facility Site',
      conductedBy: user.name || 'Field Engineer',
      date: new Date().toISOString().split('T')[0],
      amrModel: 'DFleet Standard AGV/AMR',
      sections: JSON.parse(JSON.stringify(DEFAULT_CHECKLIST_SECTIONS)),
      actionItems: [],
      verifiedBy: '',
      verificationDate: '',
      verifierDesignation: 'DF Automation Specialist',
      overallStatus: 'ACTION_REQUIRED',
      attachments: [],
      sensorSnapshots: [
        {
          wifiStrength: wifi.strengthPercent,
          wifiStatus: wifi.quality,
          wifiDownlink: wifi.downlink,
          magneticFieldUt: magnet.available && magnet.magnitudeUt !== null ? magnet.magnitudeUt : undefined,
          magneticAnomaly: magnet.available && magnet.anomalyLevel !== 'Normal',
          recordedAt: new Date().toISOString(),
        },
      ],
      notes: '',
    };

    try {
      const created = await api.createReport(newReportTemplate);
      setReports((prev) => [created, ...prev]);
      setActiveReport(created);
      setView('editor');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Failed to create new report', err);
      alert('Failed to initiate site validation test.');
    } finally {
      setCreatingReport(false);
    }
  };

  const handleOpenReport = (report: SiteReport) => {
    setActiveReport(report);
    setView('editor');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveReport = async (updated: SiteReport) => {
    try {
      const saved = await api.updateReport(updated.id, updated);
      setReports((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      setActiveReport(saved);
    } catch (err) {
      console.error('Failed to update report', err);
      throw err;
    }
  };

  const handleDeleteReport = (id: string) => {
    setDeletingReportId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingReportId) return;
    try {
      await api.deleteReport(deletingReportId);
      setReports((prev) => prev.filter((r) => r.id !== deletingReportId));
      if (activeReport?.id === deletingReportId) {
        setActiveReport(null);
        setView('dashboard');
      }
    } catch (err) {
      console.error('Failed to delete report', err);
      alert('Could not delete report.');
    } finally {
      setDeletingReportId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4FAF9] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-[2rem] border border-[#E0F2F1] shadow-xs">
          <div className="w-10 h-10 border-4 border-[#00796B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-[#00695C] tracking-wide">Initializing DF Ultimate...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const deletingReport = reports.find((r) => r.id === deletingReportId);

  return (
    <div className="min-h-screen bg-[#F4FAF9] text-slate-800 flex flex-col font-sans selection:bg-[#00796B] selection:text-white">
      {/* Header Bar */}
      <Header
        wifi={wifi}
        magnet={magnet}
        activeView={view}
        onNavigateHome={() => setView('dashboard')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {view === 'dashboard' ? (
          <DashboardView
            reports={reports}
            wifi={wifi}
            magnet={magnet}
            loading={loadingReports}
            creating={creatingReport}
            onNewReport={handleStartNewReport}
            onOpenReport={handleOpenReport}
            onDeleteReport={handleDeleteReport}
            onRefreshWifi={refreshWifi}
            onRunWifiSurvey={runDetailedSurvey}
            onSimulateWifi={simulateValue}
            onRequestMagPermission={requestIosPermission}
            onRedetectMag={redetectMag}
          />
        ) : activeReport ? (
          <ValidationChecklistEditor
            report={activeReport}
            wifi={wifi}
            magnet={magnet}
            onSave={handleSaveReport}
            onBack={() => setView('dashboard')}
            onDelete={handleDeleteReport}
          />
        ) : (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-[#E0F2F1] p-8 max-w-md mx-auto">
            <p className="text-sm font-medium text-slate-500">No validation report selected.</p>
            <button
              onClick={() => setView('dashboard')}
              className="mt-4 px-6 py-2.5 bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#00796B]/20 transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingReportId}
        title={deletingReport?.projectTitle || 'Selected Site Report'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingReportId(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
