import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { resolve } from 'path';
import fs from 'fs/promises';
import fsOrigin from 'fs'
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            src: resolve(__dirname, 'src'),
        },
    },
    esbuild: {
        loader: 'tsx',
        include: /src\/.*\.tsx?$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [
                {
                    name: 'load-js-files-as-tsx',
                    setup(build) {
                        build.onLoad(
                            { filter: /src\\.*\.js$/ },
                            async (args) => ({
                                loader: 'tsx',
                                contents: await fs.readFile(args.path, 'utf8'),
                            })
                        );
                    },
                },
            ],
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,  // Новый порт, так как 49080 занят Nginx
        https: {
            key: fsOrigin.readFileSync(path.resolve(__dirname, 'certs/localhost-key.pem')),
            cert: fsOrigin.readFileSync(path.resolve(__dirname, 'certs/localhost.pem')),
        },
        strictPort: true,
        cors: true
    },
    
    // plugins: [react(),svgr({
    //   exportAsDefault: true
    // })],

    plugins: [svgr(), react()],
});