import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eaqari.app',
  appName: 'Eaqari',
  webDir: 'out',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '812155132439-u9bo09n8ltmsvkcjmufcta5hnj1g93up.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      backgroundColor: '#ffffff',
      launchShowDuration: 3000,
      launchAutoHide: true,
      androidSplashResourceName: 'splash',
    }
  },
  server: {
    cleartext: true
  }
};

export default config;
