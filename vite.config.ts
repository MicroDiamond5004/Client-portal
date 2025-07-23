import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { resolve } from 'path';
import fs from 'fs/promises';
import fsOrigin from 'fs'
import svgr from '@svgr/rollup';
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    resolve: {
        alias: {
            src: resolve(__dirname, 'src'),
            react: path.resolve('./node_modules/react'),
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
	allowedHosts: ['lk.lead.aero'],
	proxy: {
 		'/api': 'http://localhost:3001',
  	},
        host: '0.0.0.0',
        port: 5173,  // Новый порт, так как 49080 занят Nginx
    },
    plugins: [svgr(), react(),
    	legacy({
      	targets: ['defaults', 'not IE 11', 'ios >= 10'],
    }),
  ],
    
    // plugins: [react(),svgr({
    //   exportAsDefault: true
    // })],

    // plugins: [svgr(), react()],
});
