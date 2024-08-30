import { defineConfig } from 'vite'
export default defineConfig({
    base: './',
    build: {
        minify: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['cohere-ai']
                }
            }
        }
    }
})