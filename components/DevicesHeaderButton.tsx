import React from "react";
import { Laptop, MonitorSmartphone } from "lucide-react";
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
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
        hasMultiple
          ? "bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/60 shadow-sm"
          : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
      title={`${deviceCount} Logged-in ${deviceCount === 1 ? 'Device' : 'Devices'} • View details and logout`}
      aria-label="Manage logged-in devices"
    >
      <div className="relative flex items-center justify-center">
        {hasMultiple ? (
          <MonitorSmartphone className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        ) : (
          <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        )}
      </div>

      <span className="hidden sm:inline">
        {deviceCount} {deviceCount === 1 ? "Device" : "Devices"}
      </span>

      <span
        className={`px-1.5 py-0.2 text-[10px] font-black rounded-full min-w-[16px] text-center ${
          hasMultiple
            ? "bg-primary-600 text-white animate-in zoom-in"
            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 sm:hidden"
        }`}
      >
        {deviceCount}
      </span>
    </button>
  );
};
