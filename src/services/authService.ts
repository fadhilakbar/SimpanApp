import React from 'react';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

const STORAGE_KEY_LOCK = 'simpan_security_lock';
const STORAGE_KEY_PIN = 'simpan_security_pin';
const STORAGE_KEY_FACEID = 'simpan_security_faceid';
const STORAGE_KEY_USERNAME = 'simpan_user_name';
const STORAGE_KEY_AVATAR = 'simpan_user_avatar';
const STORAGE_KEY_ONBOARDING = 'simpan_has_completed_onboarding';

export interface UserProfile {
  name: string;
  avatar: string;
}

export interface SecuritySettings {
  isLockEnabled: boolean;
  pin: string;
  useFaceId: boolean;
  hasPin: boolean;
}

export const SIMPAN_PROFILE_UPDATED_EVENT = 'simpan_profile_updated';

// Check if user has ever configured a valid 6-digit PIN
export function hasConfiguredPin(): boolean {
  const pin = localStorage.getItem(STORAGE_KEY_PIN);
  return typeof pin === 'string' && pin.trim().length === 6;
}

// User Profile
export function getUserProfile(): UserProfile {
  return {
    name: localStorage.getItem(STORAGE_KEY_USERNAME) || 'Pengguna',
    avatar: localStorage.getItem(STORAGE_KEY_AVATAR) || 'default',
  };
}

export function setUserProfile(profile: Partial<UserProfile>): void {
  if (profile.name !== undefined) {
    localStorage.setItem(STORAGE_KEY_USERNAME, profile.name);
  }
  if (profile.avatar !== undefined) {
    localStorage.setItem(STORAGE_KEY_AVATAR, profile.avatar);
  }
  window.dispatchEvent(
    new CustomEvent(SIMPAN_PROFILE_UPDATED_EVENT, {
      detail: getUserProfile(),
    })
  );
}

// Custom hook to automatically re-render when user profile changes
export function useUserProfile(): {
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;
} {
  const [profile, setProfileState] = React.useState<UserProfile>(getUserProfile);

  React.useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        setProfileState(customEvent.detail);
      } else {
        setProfileState(getUserProfile());
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_USERNAME || e.key === STORAGE_KEY_AVATAR) {
        setProfileState(getUserProfile());
      }
    };

    window.addEventListener(SIMPAN_PROFILE_UPDATED_EVENT, handleProfileUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener(SIMPAN_PROFILE_UPDATED_EVENT, handleProfileUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  return {
    profile,
    setProfile: setUserProfile,
  };
}


// Security Settings
export function getSecuritySettings(): SecuritySettings {
  const hasPin = hasConfiguredPin();
  const storedLock = localStorage.getItem(STORAGE_KEY_LOCK);
  // Kunci hanya aktif jika user pernah set PIN
  const isLock = hasPin && (storedLock === null ? true : storedLock === 'true');
  const pin = localStorage.getItem(STORAGE_KEY_PIN) || '';
  const useFaceId = localStorage.getItem(STORAGE_KEY_FACEID) === 'true';
  return {
    isLockEnabled: isLock,
    pin,
    useFaceId,
    hasPin,
  };
}

export function setSecurityLock(
  enabled: boolean,
  pin?: string,
  useFaceId?: boolean
): void {
  localStorage.setItem(STORAGE_KEY_LOCK, enabled ? 'true' : 'false');
  if (pin) {
    localStorage.setItem(STORAGE_KEY_PIN, pin);
  }
  if (useFaceId !== undefined) {
    localStorage.setItem(STORAGE_KEY_FACEID, useFaceId ? 'true' : 'false');
  }
}

export function removeSecurityPin(): void {
  localStorage.removeItem(STORAGE_KEY_PIN);
  localStorage.setItem(STORAGE_KEY_LOCK, 'false');
  localStorage.setItem(STORAGE_KEY_FACEID, 'false');
}

export function verifyPin(inputPin: string): boolean {
  const savedPin = localStorage.getItem(STORAGE_KEY_PIN);
  if (!savedPin) return false;
  return savedPin === inputPin;
}

// Cek apakah perangkat mendukung biometrik nyata (Face ID / Touch ID / Fingerprint / Face Unlock)
export async function isBiometricsAvailable(): Promise<boolean> {
  // Native iOS/Android: pakai API biometrik asli perangkat (LocalAuthentication / BiometricPrompt)
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch {
      return false;
    }
  }

  // Fallback web/PWA: WebAuthn Platform Authenticator
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
  return false;
}

// Autentikasi biometrik nyata: LocalAuthentication (iOS) / BiometricPrompt (Android) saat native,
// atau Web Authentication API saat berjalan di browser/PWA.
export async function authenticateWithBiometrics(customReason?: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await BiometricAuth.authenticate({
        reason: customReason || 'Buka kunci SIMPAN - Personal Archive',
        cancelTitle: 'Batal',
        allowDeviceCredential: true,
        androidTitle: 'Autentikasi Biometrik SIMPAN',
        androidSubtitle: customReason || 'Gunakan sidik jari atau wajah Anda',
      });
      return true;
    } catch {
      return false;
    }
  }

  const available = await isBiometricsAvailable();
  if (!available) {
    return false;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Coba minta verifikasi kredensial pengguna
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return Boolean(assertion);
  } catch (error: any) {
    // Jika kredensial belum terdaftar di platform, minta pendaftaran lokal sekali untuk memicu dialog Face ID / Touch ID
    if (error.name === 'NotAllowedError') {
      return false;
    }
    try {
      const challenge = new Uint8Array(32);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(challenge);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'SIMPAN - Personal Archive' },
          user: {
            id: userId,
            name: 'simpan_local_user',
            displayName: 'Pengguna SIMPAN',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });
      return Boolean(credential);
    } catch {
      return false;
    }
  }
}

// Onboarding State
export function getHasCompletedOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY_ONBOARDING) === 'true';
}

export function setHasCompletedOnboarding(completed: boolean): void {
  localStorage.setItem(STORAGE_KEY_ONBOARDING, completed ? 'true' : 'false');
}
