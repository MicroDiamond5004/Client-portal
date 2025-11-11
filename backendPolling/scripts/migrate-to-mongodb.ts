import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { connectToDatabase, disconnectFromDatabase } from '../src/database/connection';
import { User, Order, Message, Subscription, Session } from '../src/models';
import { UserData, ELMATicket } from '../src/data/types';

const DATA_DIR = path.resolve(__dirname, '../src/data/user');
const AUTH_DATA_DIR = path.resolve(__dirname, '../src/data/auth');
const SUBSCRIPTIONS_DIR = path.resolve(__dirname, '../src/data/subscriptions');
const COOKIES_DIR = path.resolve(__dirname, '../src/data/cookies');

interface AuthData {
  auth_login: string;
  password: string;
  klient_name: string;
  klient_id: string;
}

interface CookieData {
  token: string;
  cookie: string;
}

async function readGzipJson(filePath: string): Promise<any> {
  const buffer = fs.readFileSync(filePath);
  const decompressed = zlib.gunzipSync(buffer).toString('utf-8');
  return JSON.parse(decompressed);
}

async function migrateUsers() {
  console.log('🔄 Migrating users...');
  
  const authDataPath = path.join(AUTH_DATA_DIR, 'authData.json');
  if (!fs.existsSync(authDataPath)) {
    console.log('⚠ No auth data found');
    return;
  }

  const authData: AuthData[] = JSON.parse(fs.readFileSync(authDataPath, 'utf-8'));
  
  for (const auth of authData) {
    try {
      const existingUser = await User.findOne({ email: auth.auth_login });
      if (existingUser) {
        console.log(`⏭ User ${auth.auth_login} already exists, skipping...`);
        continue;
      }

      const user = new User({
        email: auth.auth_login,
        password: auth.password,
        clientName: auth.klient_name,
        clientId: auth.klient_id,
        isActive: true
      });

      await user.save();
      console.log(`✅ Migrated user: ${auth.auth_login}`);
    } catch (error) {
      console.error(`❌ Error migrating user ${auth.auth_login}:`, error);
    }
  }
}

async function migrateOrders() {
  console.log('🔄 Migrating orders...');
  
  if (!fs.existsSync(DATA_DIR)) {
    console.log('⚠ No user data directory found');
    return;
  }

  const files = fs.readdirSync(DATA_DIR);
  let totalOrders = 0;

  for (const file of files) {
    if (!file.endsWith('.json.gz') && !file.endsWith('.json')) {
      continue;
    }

    const userId = path.basename(file, file.endsWith('.json.gz') ? '.json.gz' : '.json');
    
    try {
      // Find user by clientId
      const user = await User.findOne({ clientId: userId });
      if (!user) {
        console.log(`⚠ User not found for clientId: ${userId}`);
        continue;
      }

      const filePath = path.join(DATA_DIR, file);
      let userData: UserData;

      if (file.endsWith('.json.gz')) {
        userData = await readGzipJson(filePath);
      } else {
        userData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }

      // Migrate orders
      for (const orderData of userData.orders) {
        try {
          const existingOrder = await Order.findOne({ elmaId: orderData.__id,  });

          if (existingOrder) {
            continue;
          }

          const order = new Order({
            userId: user._id,
            elmaId: orderData.__id || `temp-${Date.now()}-${Math.random()}`,
            orderData: orderData,
            status: 'active',
            isChanged: orderData.isChanged || false
          });

          await order.save();
          totalOrders++;
        } catch (error) {
          console.error(`❌ Error migrating order ${orderData.__id}:`, error);
        }
      }

      console.log(`✅ Migrated orders for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error processing user data ${userId}:`, error);
    }
  }

  console.log(`✅ Total orders migrated: ${totalOrders}`);
}

async function migrateMessages() {
  console.log('🔄 Migrating messages...');
  
  if (!fs.existsSync(DATA_DIR)) {
    console.log('⚠ No user data directory found');
    return;
  }

  const files = fs.readdirSync(DATA_DIR);
  let totalMessages = 0;

  for (const file of files) {
    if (!file.endsWith('.json.gz') && !file.endsWith('.json')) {
      continue;
    }

    const userId = path.basename(file, file.endsWith('.json.gz') ? '.json.gz' : '.json');
    
    try {
      // Find user by clientId
      const user = await User.findOne({ clientId: userId });
      if (!user) {
        console.log(`⚠ User not found for clientId: ${userId}`);
        continue;
      }

      const filePath = path.join(DATA_DIR, file);
      let userData: UserData;

      if (file.endsWith('.json.gz')) {
        userData = await readGzipJson(filePath);
      } else {
        userData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }

      // Migrate messages
      if (userData.messages && Array.isArray(userData.messages)) {
        for (const messageData of userData.messages) {
          try {
            const existingMessage = await Message.findOne({ 
              userId: user._id, 
              targetId: messageData.target?.id 
            });
            if (existingMessage) {
              continue;
            }

            const message = new Message({
              userId: user._id,
              targetId: messageData.target?.id || 'unknown',
              authorId: messageData.author,
              body: messageData.body,
              comments: messageData.comments || [],
              unreadCommentsCount: messageData.unreadCommentsCount || 0
            });

            await message.save();
            totalMessages++;
          } catch (error) {
            console.error(`❌ Error migrating message:`, error);
          }
        }
      }

      console.log(`✅ Migrated messages for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error processing user messages ${userId}:`, error);
    }
  }

  console.log(`✅ Total messages migrated: ${totalMessages}`);
}

async function migrateSubscriptions() {
  console.log('🔄 Migrating subscriptions...');
  
  if (!fs.existsSync(SUBSCRIPTIONS_DIR)) {
    console.log('⚠ No subscriptions directory found');
    return;
  }

  const files = fs.readdirSync(SUBSCRIPTIONS_DIR);
  let totalSubscriptions = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const userId = path.basename(file, '.json');
    
    try {
      // Find user by clientId
      const user = await User.findOne({ clientId: userId });
      if (!user) {
        console.log(`⚠ User not found for clientId: ${userId}`);
        continue;
      }

      const filePath = path.join(SUBSCRIPTIONS_DIR, file);
      const subscriptions: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const subData of subscriptions) {
        try {
          const existingSub = await Subscription.findOne({ endpoint: subData.endpoint });
          if (existingSub) {
            continue;
          }

          const subscription = new Subscription({
            userId: user._id,
            endpoint: subData.endpoint,
            keys: subData.keys,
            email: subData.email,
            isActive: true
          });

          await subscription.save();
          totalSubscriptions++;
        } catch (error) {
          console.error(`❌ Error migrating subscription:`, error);
        }
      }

      console.log(`✅ Migrated subscriptions for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error processing subscriptions ${userId}:`, error);
    }
  }

  console.log(`✅ Total subscriptions migrated: ${totalSubscriptions}`);
}

async function migrateSessions() {
  console.log('🔄 Migrating sessions...');
  
  if (!fs.existsSync(COOKIES_DIR)) {
    console.log('⚠ No cookies directory found');
    return;
  }

  const files = fs.readdirSync(COOKIES_DIR);
  let totalSessions = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    try {
      const filePath = path.join(COOKIES_DIR, file);
      const cookieData: CookieData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Try to find user by token (this might need adjustment based on your auth logic)
      const existingSession = await Session.findOne({ token: cookieData.token });
      if (existingSession) {
        continue;
      }

      // Create a temporary user reference - you might need to adjust this
      const session = new Session({
        userId: new (require('mongoose').Types.ObjectId)(), // Temporary - needs proper user mapping
        token: cookieData.token,
        cookie: cookieData.cookie,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      await session.save();
      totalSessions++;
    } catch (error) {
      console.error(`❌ Error migrating session:`, error);
    }
  }

  console.log(`✅ Total sessions migrated: ${totalSessions}`);
}

async function main() {
  try {
    console.log('🚀 Starting MongoDB migration...');
    
    await connectToDatabase();
    
    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Order.deleteMany({});
    await Message.deleteMany({});
    await Subscription.deleteMany({});
    await Session.deleteMany({});
    
    // Run migrations
    await migrateUsers();
    await migrateOrders();
    await migrateMessages();
    await migrateSubscriptions();
    await migrateSessions();
    
    console.log('✅ Migration completed successfully!');
    
    // Print summary
    const userCount = await User.countDocuments();
    const orderCount = await Order.countDocuments();
    const messageCount = await Message.countDocuments();
    const subscriptionCount = await Subscription.countDocuments();
    const sessionCount = await Session.countDocuments();
    
    console.log('\n📊 Migration Summary:');
    console.log(`Users: ${userCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(`Messages: ${messageCount}`);
    console.log(`Subscriptions: ${subscriptionCount}`);
    console.log(`Sessions: ${sessionCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await disconnectFromDatabase();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  main();
}
