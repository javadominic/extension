import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    {
      name: 'strip-heavy-onnx-wasm',
      generateBundle(_options, bundle) {
        for (const fileName of Object.keys(bundle)) {
          if (fileName.includes('ort-wasm') && fileName.endsWith('.wasm')) {
            delete bundle[fileName]
          }
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        onboarding: 'src/onboarding/index.html',
        offscreen: 'src/offscreen/offscreen.html',
      },
    },
  },
})
