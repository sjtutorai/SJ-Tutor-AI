import React from "react";
import { Users } from "lucide-react";
import { DeviceSession } from "../services/deviceService";

interface DevicesHeaderButtonProps {
  devices: DeviceSession[];
  onClick: () => void;
}

export const DevicesHeaderButton: React.FC<DevicesHeaderButtonProps> = ({
  devices,
  onClick,
}) => {
  const deviceCount = devices.length > 0 ? devices.length : 1;
  const hasMultiple = deviceCount > 1;

  return (
    <button
      onClick={onClick}
      id="header-devices-btn"
      className={`relative flex flex-col items-center justify-center px-2 py-1 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
        hasMultiple
          ? "bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/60 shadow-xs"
          : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
      title={`${deviceCount} Active Logged-in ${deviceCount === 1 ? 'Device' : 'Devices'} • Click to view and manage`}
      aria-label="Manage logged-in devices"
    >
      {/* 3 People Icon */}
      <Users className={`w-4 h-4 ${hasMultiple ? 'text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400'}`} />
      
      {/* Number of Logged in devices below the icon */}
      <span className="text-[10px] font-black leading-none mt-0.5 font-mono text-slate-700 dark:text-slate-300">
        {deviceCount}
      </span>
    </button>
  );
};

export default DevicesHeaderButton;
