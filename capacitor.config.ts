import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gabrielekerete.bms',
  appName: 'BMS',
  webDir: '.next',
  server: {
    url: 'http://10.0.2.2:9002',
    cleartext: true,
  },
};

export default config;
