import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kynandev.simpan',
  appName: 'SIMPAN',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'simpan',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#FAF9F6',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'never',
    scrollDisabled: true,
    preferredContentMode: 'mobile',
  },
};

export default config;
