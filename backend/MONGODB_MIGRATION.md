# MongoDB Migration Guide

This guide will help you migrate your backend from JSON file storage to MongoDB.

## Prerequisites

1. **Install MongoDB**
   - Local: Download and install MongoDB Community Server
   - Cloud: Use MongoDB Atlas (recommended for production)

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

## Migration Steps

### 1. Setup Environment

1. Copy the environment example file:
   ```bash
   cp env.example .env
   ```

2. Update `.env` with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/client-portal
   # or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/client-portal
   ```

### 2. Run Migration Script

1. **Backup your existing data** (optional but recommended):
   ```bash
   cp -r src/data src/data_backup
   ```

2. **Run the migration script**:
   ```bash
   npm run migrate
   ```

   This will:
   - Connect to MongoDB
   - Clear existing data (optional)
   - Migrate users from `authData.json`
   - Migrate orders from user JSON files
   - Migrate messages from user JSON files
   - Migrate subscriptions from subscription JSON files
   - Migrate sessions from cookie JSON files

### 3. Verify Migration

After migration, check the console output for:
- ✅ Success messages for each migration step
- 📊 Migration summary with counts
- ❌ Any error messages

### 4. Start the Development Server

```bash
npm run dev
```

The server will now use MongoDB instead of JSON files and will automatically restart when you make code changes thanks to nodemon.

## Data Structure Changes

### Before (JSON Files)
```
src/data/
├── auth/
│   └── authData.json
├── user/
│   ├── user1.json.gz
│   └── user2.json.gz
├── subscriptions/
│   ├── user1.json
│   └── user2.json
└── cookies/
    ├── token1.json
    └── token2.json
```

### After (MongoDB Collections)
```
MongoDB Database: client-portal
├── users
├── orders
├── messages
├── subscriptions
├── sessions
└── filepreviews
```

## Key Benefits

1. **Better Performance**: Indexed queries, connection pooling
2. **Scalability**: Horizontal scaling with sharding
3. **Data Integrity**: ACID transactions, validation
4. **Query Flexibility**: Complex queries, aggregation pipelines
5. **Backup & Recovery**: Built-in tools and cloud solutions

## Troubleshooting

### Common Issues

1. **Connection Error**
   - Check MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity (for Atlas)

2. **Migration Errors**
   - Check file permissions
   - Verify JSON file format
   - Check MongoDB user permissions

3. **Performance Issues**
   - Add indexes for frequently queried fields
   - Use connection pooling
   - Monitor query performance

### Rollback Plan

If you need to rollback to JSON files:

1. Stop the server
2. Update imports in `src/index.ts`:
   ```typescript
   // Change from:
   import { ... } from './data/mongodbStorage';
   // To:
   import { ... } from './data/storage';
   ```
3. Restore from backup:
   ```bash
   rm -rf src/data
   mv src/data_backup src/data
   ```

## Production Considerations

1. **Use MongoDB Atlas** for production
2. **Enable authentication** and SSL
3. **Set up monitoring** and alerts
4. **Configure backups** and point-in-time recovery
5. **Use connection pooling** for better performance
6. **Add proper indexes** for your query patterns

## Development Workflow

### Auto-Reload Development
The server now uses nodemon for automatic restarts:

```bash
# Start development server with auto-reload
npm run dev

# Alternative with explicit file watching
npm run dev:watch
```

**Features:**
- ✅ Automatically restarts when you save TypeScript, JavaScript, or JSON files
- ✅ Watches the `src/` directory
- ✅ Ignores test files, node_modules, and build artifacts
- ✅ 1-second delay to prevent multiple restarts
- ✅ Detailed error messages and logging

### Available Scripts
- `npm run dev` - Development server with auto-reload
- `npm run dev:watch` - Development with explicit file watching
- `npm run migrate` - Run data migration from JSON to MongoDB
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify your MongoDB connection
3. Check the migration script output
4. Review the data structure in MongoDB Compass or similar tool
5. Ensure nodemon is properly installed: `npm list nodemon`
