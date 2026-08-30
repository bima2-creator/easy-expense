import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const PIN_KEY = "app_lock_pin";
const ENABLED_KEY = "app_lock_enabled";
const TIMEOUT_KEY = "app_lock_timeout_minutes";
const LAST_BG_KEY = "app_lock_last_bg_at";
const BIOMETRIC_KEY = "app_lock_biometric_enabled";

export const LOCK_TIMEOUT_OPTIONS: { label: string; minutes: number }[] = [
  { label: "Langsung", minutes: 0 },
  { label: "1 menit", minutes: 1 },
  { label: "5 menit", minutes: 5 },
  { label: "10 menit", minutes: 10 },
  { label: "30 menit", minutes: 30 },
];

type AppLockContextType = {
  ready: boolean;
  enabled: boolean;
  hasPin: boolean;
  timeoutMinutes: number;
  isLocked: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  setupPin: (pin: string) => Promise<void>;
  disableLock: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  setTimeoutMinutes: (m: number) => Promise<void>;
  setBiometricEnabled: (v: boolean) => Promise<void>;
  tryBiometricUnlock: () => Promise<boolean>;
  unlock: () => void;
  setLockSuppressed: (v: boolean) => void;
};

const AppLockContext = createContext<AppLockContextType | null>(null);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [timeoutMinutes, setTimeoutMinutesState] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const suppressRef = useRef(false);

  const setLockSuppressed = useCallback((v: boolean) => { suppressRef.current = v; }, []);

  useEffect(() => {
    (async () => {
      const [pin, en, to, bio, hardware, enrolled] = await Promise.all([
        SecureStore.getItemAsync(PIN_KEY),
        AsyncStorage.getItem(ENABLED_KEY),
        AsyncStorage.getItem(TIMEOUT_KEY),
        AsyncStorage.getItem(BIOMETRIC_KEY),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      const enabledVal = en === "1" && !!pin;
      const timeoutVal = to ? parseInt(to, 10) : 0;
      setHasPin(!!pin);
      setEnabled(enabledVal);
      setTimeoutMinutesState(timeoutVal);
      setBiometricAvailable(hardware && enrolled);
      setBiometricEnabledState(bio === "1");
      if (enabledVal) {
        const lastBg = await AsyncStorage.getItem(LAST_BG_KEY);
        if (!lastBg) {
          setIsLocked(true);
        } else {
          const elapsedMs = Date.now() - parseInt(lastBg, 10);
          setIsLocked(elapsedMs >= timeoutVal * 60000);
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next: AppStateStatus) => {
      const prev = appState.current;
      // Cuma "background" yang dihitung sebagai user benar-benar keluar app (tekan
      // home, pindah app lain, layar mati). "inactive" itu status transisi sesaat
      // yang juga muncul saat kamera/scan struk jalan atau dialog izin muncul —
      // kalau ikut dihitung, timeout "Langsung" akan salah mengunci app padahal
      // user cuma lagi motret struk, bukan meninggalkan app.
      if (prev === "active" && next === "background") {
        await AsyncStorage.setItem(LAST_BG_KEY, String(Date.now()));
      } else if (prev === "background" && next === "active") {
        if (enabled && !suppressRef.current) {
          const lastBg = await AsyncStorage.getItem(LAST_BG_KEY);
          const elapsedMs = lastBg ? Date.now() - parseInt(lastBg, 10) : Infinity;
          if (elapsedMs >= timeoutMinutes * 60000) setIsLocked(true);
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [enabled, timeoutMinutes]);

  const setupPin = useCallback(async (pin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, pin);
    await AsyncStorage.setItem(ENABLED_KEY, "1");
    setHasPin(true);
    setEnabled(true);
  }, []);

  const disableLock = useCallback(async () => {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await AsyncStorage.setItem(ENABLED_KEY, "0");
    await AsyncStorage.setItem(BIOMETRIC_KEY, "0");
    setHasPin(false);
    setEnabled(false);
    setIsLocked(false);
    setBiometricEnabledState(false);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    return stored === pin;
  }, []);

  const setTimeoutMinutes = useCallback(async (m: number) => {
    await AsyncStorage.setItem(TIMEOUT_KEY, String(m));
    setTimeoutMinutesState(m);
  }, []);

  const setBiometricEnabled = useCallback(async (v: boolean) => {
    await AsyncStorage.setItem(BIOMETRIC_KEY, v ? "1" : "0");
    setBiometricEnabledState(v);
  }, []);

  const tryBiometricUnlock = useCallback(async () => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Buka Easy Expense",
        cancelLabel: "Pakai PIN",
        disableDeviceFallback: true,
      });
      if (res.success) {
        unlock();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const unlock = useCallback(() => setIsLocked(false), []);

  return (
    <AppLockContext.Provider
      value={{
        ready, enabled, hasPin, timeoutMinutes, isLocked, biometricAvailable, biometricEnabled,
        setupPin, disableLock, verifyPin, setTimeoutMinutes, setBiometricEnabled, tryBiometricUnlock, unlock,
        setLockSuppressed,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error("useAppLock must be used within AppLockProvider");
  return ctx;
}
