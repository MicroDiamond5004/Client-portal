# Development Guide

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation
```bash
cd backend
npm install
```

### Environment Setup
1. Copy the environment example:
   ```bash
   cp env.example .env
   ```

2. Update `.env` with your configuration:
   ```
   MONGODB_URI=mongodb://localhost:27017/client-portal
   API_USER=your_api_user
   API_PASSWORD=your_api_password
   JWT_SECRET=your_jwt_secret_key
   ```

## Development Commands

### Start Development Server with Auto-Reload
```bash
npm run dev
```
This uses nodemon to automatically restart the server when you make changes to:
- TypeScript files (`.ts`)
- JavaScript files (`.js`) 
- JSON files (`.json`)

### Alternative Development Commands
```bash
# Basic development server
npm run dev

# Development with explicit file watching
npm run dev:watch

# Run migration script
npm run migrate

# Build for production
npm run build

# Start production server
npm start
```

## File Watching

Nodemon is configured to watch:
- ✅ `src/` directory
- ✅ Files with extensions: `.ts`, `.js`, `.json`
- ❌ Ignores: test files, node_modules, dist, logs

## Development Workflow

1. **Start the server**: `npm run dev`
2. **Make changes** to your code
3. **Server automatically restarts** when you save files
4. **Check console** for any errors or warnings

## Troubleshooting

### Server Not Restarting
- Check that nodemon is installed: `npm list nodemon`
- Verify nodemon.json configuration
- Check file permissions

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify network connectivity (for Atlas)

### TypeScript Errors
- Run `npm run build` to check for compilation errors
- Ensure all imports are correct
- Check tsconfig.json configuration

## Hot Reload Features

- **Automatic Restart**: Server restarts on file changes
- **Fast Reload**: 1-second delay to prevent multiple restarts
- **Environment Variables**: NODE_ENV set to development
- **Error Recovery**: Server restarts even after crashes

## Production vs Development

### Development
- Uses nodemon for auto-reload
- TypeScript files executed directly with ts-node
- Detailed error messages
- Hot reload enabled

### Production
- Compiled JavaScript files
- No auto-reload
- Optimized performance
- Error logging to files
