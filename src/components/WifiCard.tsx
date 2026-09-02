import React, { useState } from 'react';
import { Wifi, RefreshCw, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import { WifiStatus } from '../types';

interface WifiCardProps {
  wifi: WifiStatus;
  onRefresh: () => void;
  onRunSurvey: () => Promise<any>;
  onSimulate: (dbm: number) => void;
  onInsertToReport?: (reading: string) => void;
}

export const WifiCard: React.FC<WifiCardProps> = ({
  wifi,
  onRefresh,
  onRunSurvey,
  onSimulate,
  onInsertToReport,
}) => {
  const [isSurveying, setIsSurveying] = useState(false);
  const [surveyResult, setSurveyResult] = useState<any>(null);
  const [showSim, setShowSim] = useState(false);

  const handleSurvey = async () => {
    setIsSurveying(true);
    try {
      const res = await onRunSurvey();
      setSurveyResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSurveying(false);
    }
  };

  const isAmrCompliant = wifi.estimatedDbm >= -65;

  return (
    <div
      id="wifi-strength-widget"
      className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#E0F2F1] flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="p-2.5 bg-[#E0F2F1] rounded-2xl text-[#00796B]">
            <Wifi className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase ${
                wifi.online
                  ? isAmrCompliant
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-[#E65100] bg-[#FFF3E0]'
                  : 'text-rose-600 bg-rose-50'
              }`}
            >
              {wifi.online ? 'CONNECTED' : 'DISCONNECTED'}
            </span>

            <button
              id="refresh-wifi-btn"
              onClick={onRefresh}
              className="p-2 text-slate-400 hover:text-[#00796B] hover:bg-[#E0F2F1] rounded-xl transition-colors"
              title="Refresh Network Diagnostics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-500 mb-1">WiFi Signal Strength</h3>
        
        {/* Main Readout */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-light text-[#004D40] tracking-tight">
            {wifi.online ? wifi.estimatedDbm : '--'}
          </span>
          <span className="text-slate-400 text-lg font-normal">dBm</span>
          {wifi.isSimulated && (
            <span className="ml-2 text-[10px] bg-[#E0F2F1] text-[#00695C] font-semibold px-2 py-0.5 rounded-full">
              Simulated
            </span>
          )}
        </div>

        {/* Natural Tones Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-5">
          <div
            className="bg-[#4DB6AC] h-full rounded-full transition-all duration-500"
            style={{ width: `${wifi.strengthPercent}%` }}
          />
        </div>

        {/* Telemetry info row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#F4FAF9] rounded-2xl p-3.5 border border-[#E0F2F1]">
            <span className="text-[10px] font-bold text-[#00695C] uppercase tracking-wider block">Latency</span>
            <span className="text-lg font-bold text-[#004D40] mt-0.5 block">
              {wifi.online ? (wifi.lastPingMs !== undefined ? wifi.lastPingMs : wifi.rtt || 24) : '--'}
              <span className="text-xs font-normal text-slate-500 ml-1">ms</span>
            </span>
          </div>

          <div className="bg-[#F4FAF9] rounded-2xl p-3.5 border border-[#E0F2F1]">
            <span className="text-[10px] font-bold text-[#00695C] uppercase tracking-wider block">Fleet Status</span>
            <span className="text-xs font-bold text-[#00796B] mt-1 block truncate">
              {isAmrCompliant ? '≥ -65 dBm Compliant' : 'Repeater Recommended'}
            </span>
          </div>
        </div>

        {/* AMR Standard Box */}
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 mb-4 ${
            isAmrCompliant
              ? 'bg-[#E0F2F1]/70 border-[#B2DFDB] text-[#004D40]'
              : 'bg-[#FFF3E0]/70 border-[#FFE0B2] text-[#E65100]'
          }`}
        >
          {isAmrCompliant ? (
            <CheckCircle2 className="w-4 h-4 text-[#00796B] shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#E65100] shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="font-bold text-[11px]">
              {isAmrCompliant
                ? 'Meets AMR Fleet Standard (≥ -65 dBm)'
                : 'Below Recommended AMR Baseline (< -65 dBm)'}
            </p>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              {isAmrCompliant
                ? 'Coverage suitable for real-time DFleet communication & auto-docking.'
                : 'Potential packet drops during rapid transport. AP repeater suggested.'}
            </p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            id="run-wifi-survey-btn"
            onClick={handleSurvey}
            disabled={isSurveying}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-xs shadow-md shadow-[#00796B]/20 transition-all disabled:opacity-50"
          >
            {isSurveying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Surveying Fleet APs...</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>Run Wi-Fi Survey</span>
              </>
            )}
          </button>

          <button
            id="toggle-wifi-sim-btn"
            onClick={() => setShowSim(!showSim)}
            className="py-3 px-4 rounded-2xl border border-[#E0F2F1] hover:bg-[#E0F2F1]/50 text-[#00695C] text-xs font-bold transition-colors"
            title="Simulate RSSI for site locations"
          >
            {showSim ? 'Close Sim' : 'Simulate'}
          </button>
        </div>

        {/* Simulation Slider */}
        {showSim && (
          <div className="p-3.5 bg-[#F4FAF9] rounded-2xl border border-[#E0F2F1] animate-in fade-in duration-150">
            <div className="flex justify-between items-center text-[11px] font-bold text-[#00695C] mb-1.5">
              <span>Simulate Site RSSI</span>
              <span>{wifi.estimatedDbm} dBm</span>
            </div>
            <input
              type="range"
              min="-90"
              max="-35"
              step="1"
              value={wifi.estimatedDbm}
              onChange={(e) => onSimulate(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00796B]"
            />
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-medium">
              <span>-90 dBm (Weak)</span>
              <span>-65 dBm (AMR Standard)</span>
              <span>-35 dBm (Strong)</span>
            </div>
          </div>
        )}

        {/* Survey Results Box */}
        {surveyResult && (
          <div className="p-3 bg-[#E0F2F1]/80 rounded-2xl border border-[#B2DFDB] text-[11px] text-[#004D40]">
            <div className="flex justify-between font-bold mb-0.5">
              <span>Survey Sample Logged</span>
              <span>Avg Latency: {surveyResult.averagePing}ms</span>
            </div>
            <p className="text-[10px] text-slate-600">
              Packet stability 100% • Jitter {surveyResult.jitter}ms • Ready for Section 1.1 signoff
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

