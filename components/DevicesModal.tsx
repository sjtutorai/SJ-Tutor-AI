import React, { useState } from "react";
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  Monitor, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  Globe, 
  X, 
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Lock,
  Sparkles
} from "lucide-react";
import { DeviceSession, DeviceService } from "../services/deviceService";

interface DevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceSession[];
  userId: string | null;
  onLogoutCurrentDevice: () => Promise<void>;
  onTriggerToast?: (title: string, message: string, category?: any) => void;
}

export const DevicesModal: React.FC<DevicesModalProps> = ({
  isOpen,
  onClose,
  devices,
  userId,
  onLogoutCurrentDevice,
  onTriggerToast,
}) => {
  const [loggingOutId, setLoggingOutId] = useState<string | null>(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  if (!isOpen) return null;

  const currentDevice = devices.find((d) => d.isCurrentDevice);
  const otherDevices = devices.filter((d) => !d.isCurrentDevice);

  const getDeviceIcon = (type: string, os: string) => {
    if (type === 'mobile' || os.includes('iPhone') || os.includes('Android')) {
      return <Smartphone className="w-5 h-5" />;
    }
    if (type === 'tablet' || os.includes('iPad')) {
      return <Tablet className="w-5 h-5" />;
    }
    if (os.includes('Mac') || os.includes('Windows') || os.includes('Linux')) {
      return <Laptop className="w-5 h-5" />;
    }
    return <Monitor className="w-5 h-5" />;
  };

  const handleLogoutDevice = async (device: DeviceSession) => {
    if (!userId) return;

    setLoggingOutId(device.deviceId);
    try {
      if (device.isCurrentDevice) {
        onClose();
        await onLogoutCurrentDevice();
      } else {
        const success = await DeviceService.logoutDevice(userId, device.deviceId);
        if (success) {
          onTriggerToast?.(
            "Device Logged Out", 
            `Successfully terminated session for ${device.deviceName}.`, 
            "Important Alerts"
          );
        }
      }
    } catch (err: any) {
      console.error("Failed to logout device:", err);
      onTriggerToast?.("Error", "Could not log out device. Please try again.", "Important Alerts");
    } finally {
      setLoggingOutId(null);
      setConfirmRevokeId(null);
    }
  };

  const handleLogoutAllOtherDevices = async () => {
    if (!userId) return;

    setIsLoggingOutAll(true);
    try {
      const count = await DeviceService.logoutAllOtherDevices(userId);
      onTriggerToast?.(
        "All Other Devices Logged Out", 
        `Successfully logged out ${count} remote device${count !== 1 ? 's' : ''}.`, 
        "Important Alerts"
      );
      setConfirmRevokeAll(false);
    } catch (err) {
      console.error("Failed to logout all other devices:", err);
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="devices-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center border border-primary-200 dark:border-primary-800/60 shadow-sm">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="devices-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Active Logged-In Devices
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                  {devices.length} {devices.length === 1 ? 'Device' : 'Devices'} Logged In
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage all devices and browser sessions currently logged into your account.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Current Device Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Current Device (This Session)
              </h4>
            </div>

            {currentDevice ? (
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-500/40 dark:border-emerald-500/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-200 dark:border-emerald-800/60">
                      {getDeviceIcon(currentDevice.deviceType, currentDevice.os)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                          {currentDevice.deviceName}
                        </h5>
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                          This Device
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active Now
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>
                            <strong>Logged in:</strong> {DeviceService.formatDateTime(currentDevice.loginTime).full}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>
                            <strong>Last active:</strong> {DeviceService.formatDateTime(currentDevice.lastActive).relative}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>
                            <strong>Timezone:</strong> {currentDevice.timezone}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            End-to-End Authenticated
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-200 dark:border-emerald-800/40">
                    <button
                      onClick={() => handleLogoutDevice(currentDevice)}
                      disabled={loggingOutId === currentDevice.deviceId}
                      className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    >
                      {loggingOutId === currentDevice.deviceId ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Signing Out...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          Logout from this device
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Registering current device session...
              </div>
            )}
          </div>

          {/* Other Devices Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5" />
                Other Logged-in Devices ({otherDevices.length})
              </h4>

              {otherDevices.length > 0 && (
                <button
                  onClick={() => setConfirmRevokeAll(true)}
                  disabled={isLoggingOutAll}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  Logout from All Other Devices
                </button>
              )}
            </div>

            {/* Confirm Logout All Box */}
            {confirmRevokeAll && (
              <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Sign out of all other {otherDevices.length} devices?
                    </h5>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                      This will revoke active logins across all your other computers and phones immediately. You will stay signed in on this current device.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={handleLogoutAllOtherDevices}
                        disabled={isLoggingOutAll}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        {isLoggingOutAll && <RefreshCw className="w-3 h-3 animate-spin" />}
                        Yes, Logout All Others
                      </button>
                      <button
                        onClick={() => setConfirmRevokeAll(false)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {otherDevices.length > 0 ? (
              <div className="space-y-3">
                {otherDevices.map((device) => {
                  const loginFormatted = DeviceService.formatDateTime(device.loginTime);
                  const activeFormatted = DeviceService.formatDateTime(device.lastActive);
                  const isConfirming = confirmRevokeId === device.deviceId;

                  return (
                    <div 
                      key={device.deviceId}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200 dark:border-slate-600">
                            {getDeviceIcon(device.deviceType, device.os)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {device.deviceName}
                              </h5>
                              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md">
                                {device.os}
                              </span>
                            </div>

                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span>
                                  <strong>Logged in:</strong> {loginFormatted.full}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span>
                                  <strong>Last active:</strong> {activeFormatted.relative}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span>
                                  <strong>Timezone:</strong> {device.timezone}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                          {isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleLogoutDevice(device)}
                                disabled={loggingOutId === device.deviceId}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              >
                                {loggingOutId === device.deviceId && <RefreshCw className="w-3 h-3 animate-spin" />}
                                Confirm Logout
                              </button>
                              <button
                                onClick={() => setConfirmRevokeId(null)}
                                className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRevokeId(device.deviceId)}
                              disabled={loggingOutId === device.deviceId}
                              className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Logout from this device
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No other active device sessions
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm mx-auto">
                  You are currently only logged in on this device. If you sign in on your phone or laptop, it will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Security Banner */}
          <div className="p-3.5 rounded-xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200/60 dark:border-primary-900/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Account Security Tip:</strong> If you spot a device or location you don&apos;t recognize, click <strong>Logout from this device</strong> immediately to secure your account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span>Real-time session synchronization active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
