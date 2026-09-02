import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Wifi, Compass, LogOut, Factory } from 'lucide-react';
import { WifiStatus, MagneticStatus } from '../types';

interface HeaderProps {
  wifi: WifiStatus;
  magnet: MagneticStatus;
  activeView: 'dashboard' | 'editor';
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ wifi, magnet, activeView, onNavigateHome }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#F4FAF9]/90 backdrop-blur-md border-b border-[#E0F2F1] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <button
            id="brand-home-btn"
            onClick={onNavigateHome}
            className="flex items-center gap-3.5 text-left focus:outline-hidden group"
          >
            <div className="w-12 h-12 bg-[#4DB6AC] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#4DB6AC]/20 group-hover:scale-105 transition-transform shrink-0">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#00695C]">
                  DF <span className="text-[#00796B]">Ultimate</span>
                </h1>
                <span className="bg-[#E0F2F1] text-[#00796B] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#B2DFDB]/60">
                  FRM-FLD-003
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-[#4DB6AC] uppercase tracking-[0.2em] hidden sm:block">
                Site Readiness Suite
              </p>
            </div>
          </button>

          {/* Center Sensors Indicator */}
          <div className="hidden md:flex items-center gap-3">
            {/* Wi-Fi Mini Badge */}
            <div
              id="header-wifi-indicator"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                wifi.online
                  ? wifi.strengthPercent >= 65
                    ? 'bg-[#E0F2F1] border-[#B2DFDB] text-[#00695C]'
                    : 'bg-[#FFF3E0] border-[#FFE0B2] text-[#E65100]'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
              title={`Wi-Fi: ${wifi.estimatedDbm} dBm (${wifi.quality}) - Latency: ${wifi.lastPingMs || wifi.rtt}ms`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Wi-Fi: {wifi.online ? `${wifi.estimatedDbm} dBm` : 'Offline'}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current"></span>
            </div>

            {/* Magnetometer Mini Badge */}
            <div
              id="header-mag-indicator"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                magnet.available && magnet.magnitudeUt !== null
                  ? magnet.anomalyLevel === 'Normal'
                    ? 'bg-[#E0F2F1] border-[#B2DFDB] text-[#00695C]'
                    : magnet.anomalyLevel === 'Moderate'
                    ? 'bg-[#FFF3E0] border-[#FFE0B2] text-[#E65100]'
                    : 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
              title={
                magnet.available && magnet.magnitudeUt !== null
                  ? `Magnetic Field: ${magnet.magnitudeUt.toFixed(1)} µT (${magnet.anomalyLevel})`
                  : 'No device / magnetic sensor connected'
              }
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                {magnet.available && magnet.magnitudeUt !== null
                  ? `Mag: ${magnet.magnitudeUt.toFixed(1)} µT`
                  : 'Mag: No Sensor'}
              </span>
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  magnet.available ? 'bg-current' : 'bg-slate-400'
                }`}
              ></span>
            </div>
          </div>

          {/* User Profile Pill & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 sm:gap-4 bg-white p-1.5 sm:pl-4 pl-3 rounded-full border border-[#E0F2F1] shadow-xs">
              {user && (
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[120px] sm:max-w-[160px]">
                    {user.name || 'Field Specialist'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Authorized Session
                  </span>
                </div>
              )}

              <button
                id="sign-out-btn"
                onClick={logout}
                className="bg-slate-800 text-white px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1.5"
                title="Sign Out of DF Ultimate"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

