import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Bind to all interfaces (not just localhost) so other machines on the
    // LAN can load the client during local network testing.
    host: true,
  },
});
