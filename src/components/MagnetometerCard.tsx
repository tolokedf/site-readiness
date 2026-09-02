import React from 'react';
import { Compass, AlertTriangle, CheckCircle2, ShieldAlert, RefreshCw, Smartphone, Radio } from 'lucide-react';
import { MagneticStatus } from '../types';

interface MagnetometerCardProps {
  magnet: MagneticStatus;
  onRequestPermission: () => void;
  onRedetect?: () => void;
  onInsertToReport?: (reading: string) => void;
}

export const MagnetometerCard: React.FC<MagnetometerCardProps> = ({
  magnet,
  onRequestPermission,
  onRedetect,
}) => {
  const isAvailable = magnet.available && magnet.magnitudeUt !== null;
  const isNormal = isAvailable && magnet.anomalyLevel === 'Normal';
  const isSevere = isAvailable && magnet.anomalyLevel === 'Severe';
  const isModerate = isAvailable && magnet.anomalyLevel === 'Moderate';

  // Calculate 5-bar step indicators matching Natural Tones HTML design
  const activeBars = isAvailable && magnet.magnitudeUt !== null
    ? Math.min(5, Math.max(1, Math.round((magnet.magnitudeUt / 80) * 5)))
    : 0;

  return (
    <div
      id="magnetic-field-widget"
      className="bg-white p-6 rounded-[2.5rem] shadow-xs border border-[#E0F2F1] flex flex-col justify-between"
    >
      <div>
        {/* Header with status pill & sensor redetect button */}
        <div className="flex justify-between items-center mb-4">
          <div className={`p-2.5 rounded-2xl ${isAvailable ? 'bg-[#E0F2F1] text-[#00695C]' : 'bg-slate-100 text-slate-400'}`}>
            <Compass className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase border ${
                isAvailable
                  ? isNormal
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : isSevere
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-[#E65100] bg-[#FFF3E0] border-[#FFE0B2]'
                  : 'text-slate-500 bg-slate-100 border-slate-200'
              }`}
            >
              {magnet.isDetecting
                ? 'DETECTING SENSOR...'
                : isAvailable
                ? `LIVE: ${magnet.sensorType || 'HARDWARE'}`
                : 'NO SENSOR CONNECTED'}
            </span>

            {onRedetect && (
              <button
                id="redetect-mag-sensor-btn"
                onClick={onRedetect}
                disabled={magnet.isDetecting}
                className="p-2 text-slate-400 hover:text-[#00796B] hover:bg-[#E0F2F1] rounded-xl transition-colors disabled:opacity-40"
                title="Re-scan device for hardware magnetometer"
              >
                <RefreshCw className={`w-4 h-4 ${magnet.isDetecting ? 'animate-spin text-[#00796B]' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-500 mb-1">Magnetic Field (IMU Guidance)</h3>

        {/* Main Readout */}
        <div className="flex items-baseline gap-2 mb-4">
          {isAvailable ? (
            <>
              <span className="text-4xl font-light text-[#004D40] tracking-tight">
                {magnet.magnitudeUt?.toFixed(1)}
              </span>
              <span className="text-slate-400 text-lg font-normal">μT</span>
              <span
                className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isNormal
                    ? 'bg-[#E0F2F1] text-[#00695C]'
                    : isSevere
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-[#FFE0B2] text-[#E65100]'
                }`}
              >
                {magnet.anomalyLevel}
              </span>
            </>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light text-slate-400 tracking-tight">
                --
              </span>
              <span className="text-slate-400 text-sm font-medium">μT</span>
              <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 font-semibold px-2.5 py-0.5 rounded-full border border-slate-200">
                No Device Connected
              </span>
            </div>
          )}
        </div>

        {/* Natural Tones 5-Segment Bar */}
        <div className="flex gap-1.5 h-2 mb-5">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`flex-1 rounded-full transition-colors duration-300 ${
                idx <= activeBars
                  ? isNormal
                    ? 'bg-[#4DB6AC]'
                    : isSevere
                    ? 'bg-rose-500'
                    : 'bg-[#F57C00]'
                  : 'bg-slate-100'
              }`}
            />
          ))}
        </div>

        {/* 3-Axis Vector Breakdown */}
        <div className="bg-[#F4FAF9] rounded-2xl p-3.5 border border-[#E0F2F1] mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-[#00695C] uppercase tracking-wider">
              3-Axis Geomagnetic Flux (μT)
            </span>
            <span className="text-[10px] text-slate-400">
              {isAvailable ? 'Live Hardware Vector' : 'Disconnected'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white py-1.5 px-2 rounded-xl border border-[#E0F2F1]">
              <span className="text-[9px] text-slate-400 font-bold block">X AXIS</span>
              <span className="text-xs font-bold text-[#004D40]">
                {isAvailable && magnet.x !== null ? magnet.x : '--'}
              </span>
            </div>
            <div className="bg-white py-1.5 px-2 rounded-xl border border-[#E0F2F1]">
              <span className="text-[9px] text-slate-400 font-bold block">Y AXIS</span>
              <span className="text-xs font-bold text-[#004D40]">
                {isAvailable && magnet.y !== null ? magnet.y : '--'}
              </span>
            </div>
            <div className="bg-white py-1.5 px-2 rounded-xl border border-[#E0F2F1]">
              <span className="text-[9px] text-slate-400 font-bold block">Z AXIS</span>
              <span className="text-xs font-bold text-[#004D40]">
                {isAvailable && magnet.z !== null ? magnet.z : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Anomaly & Assessment Card */}
        {isAvailable ? (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 mb-4 ${
              isNormal
                ? 'bg-[#E0F2F1]/70 border-[#B2DFDB] text-[#004D40]'
                : isSevere
                ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                : 'bg-[#FFF3E0]/70 border-[#FFE0B2] text-[#E65100]'
            }`}
          >
            {isNormal ? (
              <CheckCircle2 className="w-4 h-4 text-[#00796B] shrink-0 mt-0.5" />
            ) : isSevere ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#E65100] shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold text-[11px]">
                {isNormal
                  ? 'Normal Ambient Baseline (Safe for AMR)'
                  : isSevere
                  ? 'Abnormal Magnetic Disturbance Detected (>75 μT)'
                  : 'Moderate Magnetic Disturbance (60-75 μT)'}
              </p>
              <p className="text-[10px] text-slate-600 leading-relaxed">{magnet.description}</p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-xs flex items-start gap-2.5 mb-4">
            <Smartphone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-[11px] text-slate-700">
                No Magnetic Sensor Detected
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {magnet.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Permission Button / Actions */}
      <div className="space-y-2">
        {magnet.needsPermission ? (
          <button
            id="request-mag-permission-btn"
            onClick={onRequestPermission}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-xs shadow-md shadow-[#00796B]/20 transition-all flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4" />
            <span>Enable Device Magnetometer Sensors</span>
          </button>
        ) : !isAvailable ? (
          <button
            id="scan-mag-sensor-btn"
            onClick={onRedetect || onRequestPermission}
            disabled={magnet.isDetecting}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#F4FAF9] hover:bg-[#E0F2F1] text-[#00695C] border border-[#B2DFDB] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${magnet.isDetecting ? 'animate-spin' : ''}`} />
            <span>{magnet.isDetecting ? 'Checking Sensors...' : 'Scan for Hardware Magnetometer'}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};
