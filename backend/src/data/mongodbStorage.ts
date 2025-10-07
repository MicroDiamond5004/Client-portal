import { User, Order, Message, Subscription, Session, IUser, IOrder, IMessage, ISubscription, ISession } from '../models';
import { UserData, ELMATicket } from './types';
import mongoose from 'mongoose';

// ==================== USER DATA OPERATIONS ====================

export async function loadUserData(userId: string, isImportant = false): Promise<UserData> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      return { orders: [], messages: {} };
    }

    // Get orders for this user
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });
    const orderData: ELMATicket[] = orders.map(order => order.orderData);

    // Get messages for this user
    const messages = await Message.find({ userId: user._id }).sort({ createdAt: -1 });
    const messagesData: Record<string, any[]> = {};
    
    messages.forEach(message => {
      const targetId = message.targetId;
      if (!messagesData[targetId]) {
        messagesData[targetId] = [];
      }
      messagesData[targetId].push({
        __id: typeof message._id === 'object' && message._id !== null && 'toString' in message._id
          ? (message._id as any).toString()
          : String(message._id),
        target: { id: message.targetId },
        author: message.authorId,
        body: message.body,
        comments: message.comments,
        unreadCommentsCount: message.unreadCommentsCount,
        __createdAt: message.createdAt,
        __updatedAt: message.updatedAt,
        __deletedAt: null
      });
    });

    return {
      orders: orderData,
      messages: messagesData
    };
  } catch (error) {
    console.error('Error loading user data:', error);
    return { orders: [], messages: {} };
  }
}

export async function saveUserData(userId: string, data: UserData, isImportant = false): Promise<void> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Update orders
    for (const orderData of data.orders) {
      await Order.findOneAndUpdate(
        { elmaId: orderData.__id, userId: user._id },
        {
          orderData: orderData,
          isChanged: orderData.isChanged || false,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    // Update messages
    for (const [targetId, messages] of Object.entries(data.messages)) {
      for (const messageData of messages) {
        await Message.findOneAndUpdate(
          { 
            userId: user._id, 
            targetId: targetId,
            authorId: messageData.author,
            body: messageData.body
          },
          {
            comments: messageData.comments || [],
            unreadCommentsCount: messageData.unreadCommentsCount || 0,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
}

export async function getAllUsersData(): Promise<{ userId: string; data: UserData }[]> {
  try {
    const users = await User.find({ isActive: true });
    const results: { userId: string; data: UserData }[] = [];

    for (const user of users) {
      const data = await loadUserData(user.clientId);
      results.push({ userId: user.clientId, data });
    }

    return results;
  } catch (error) {
    console.error('Error getting all users data:', error);
    return [];
  }
}

// ==================== SUBSCRIPTION OPERATIONS ====================

export async function saveUserSubscription(userId: string, subscription: any): Promise<void> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Check if subscription already exists
    const existingSub = await Subscription.findOne({ 
      endpoint: subscription.endpoint,
      userId: user._id 
    });

    if (!existingSub) {
      const newSubscription = new Subscription({
        userId: user._id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        email: subscription.email,
        isActive: true
      });
      await newSubscription.save();
    }
  } catch (error) {
    console.error('Error saving user subscription:', error);
    throw error;
  }
}

export async function getUserSubscriptions(userId: string): Promise<any[]> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      return [];
    }

    const subscriptions = await Subscription.find({ 
      userId: user._id, 
      isActive: true 
    });

    return subscriptions.map(sub => ({
      endpoint: sub.endpoint,
      keys: sub.keys,
      email: sub.email,
      userId: userId
    }));
  } catch (error) {
    console.error('Error getting user subscriptions:', error);
    return [];
  }
}

export async function removeUserSubscription(userId: string, identifier: string): Promise<boolean> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      return false;
    }

    const result = await Subscription.updateMany(
      { 
        userId: user._id,
        $or: [
          { endpoint: identifier },
          { email: identifier }
        ]
      },
      { isActive: false }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error removing user subscription:', error);
    return false;
  }
}

export async function changeSubscription(endpoint: string, newUserId: string, newEmail: string): Promise<boolean> {
  try {
    const newUser = await User.findOne({ clientId: newUserId });
    if (!newUser) {
      return false;
    }

    // Find and update the subscription
    const subscription = await Subscription.findOne({ endpoint });
    if (!subscription) {
      return false;
    }

    // Ensure newUser._id is of the correct type (ObjectId)
    if (!newUser._id || typeof newUser._id !== 'object') {
      console.error('Invalid user _id:', newUser._id);
      return false;
    }

    subscription.userId = newUser._id as any; // Cast to any to satisfy TypeScript, but ideally fix the Subscription type
    subscription.email = newEmail;
    await subscription.save();

    return true;
  } catch (error) {
    console.error('Error changing subscription:', error);
    return false;
  }
}

export async function deleteUserSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
  try {
    const result = await Subscription.updateOne(
      { endpoint },
      { isActive: false }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error deleting subscription by endpoint:', error);
    return false;
  }
}

// ==================== AUTH OPERATIONS ====================

export async function findAuthFileByUserId(userId: string): Promise<{ email: string; data: any } | null> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      return null;
    }

    return {
      email: user.email,
      data: {
        userId: user.clientId,
        email: user.email,
        clientName: user.clientName,
        company: user.company
      }
    };
  } catch (error) {
    console.error('Error finding auth by user ID:', error);
    return null;
  }
}

// ==================== SESSION OPERATIONS ====================

export async function saveCookieAndToken(token: string, cookie: string): Promise<string> {
  try {
    // Create a temporary session - you might want to associate this with a specific user
    const session = new Session({
      userId: new mongoose.Types.ObjectId(), // Temporary - needs proper user mapping
      token,
      cookie,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await session.save();
    // Ensure session._id is a valid ObjectId before calling toString
    if (session._id && typeof session._id === 'object' && typeof session._id.toString === 'function') {
      return session._id.toString();
    } else {
      throw new Error('Session _id is missing or invalid after save.');
    }
  } catch (error) {
    console.error('Error saving cookie and token:', error);
    throw error;
  }
}

export async function getCookieByToken(token: string): Promise<string | null> {
  try {
    const session = await Session.findOne({ token });
    return session ? session.cookie : null;
  } catch (error) {
    console.error('Error getting cookie by token:', error);
    return null;
  }
}

export async function deleteCookieByToken(token: string): Promise<boolean> {
  try {
    const result = await Session.deleteOne({ token });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting cookie by token:', error);
    return false;
  }
}

// ==================== USER MANAGEMENT ====================

export async function createUser(userData: {
  email: string;
  password: string;
  clientName: string;
  clientId: string;
  company?: string;
}): Promise<IUser> {
  try {
    const user = new User(userData);
    await user.save();
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function findUserByEmail(email: string): Promise<IUser | null> {
  try {
    return await User.findOne({ email });
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

export async function findUserByClientId(clientId: string): Promise<IUser | null> {
  try {
    return await User.findOne({ clientId });
  } catch (error) {
    console.error('Error finding user by client ID:', error);
    return null;
  }
}

export async function updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
  try {
    return await User.findOneAndUpdate(
      { clientId: userId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

// ==================== ORDER OPERATIONS ====================

export async function createOrder(userId: string, orderData: ELMATicket): Promise<IOrder> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const order = new Order({
      userId: user._id,
      elmaId: orderData.__id || `temp-${Date.now()}-${Math.random()}`,
      orderData,
      status: 'active',
      isChanged: orderData.isChanged || false
    });

    await order.save();
    return order;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

export async function updateOrder(orderId: string, updateData: Partial<IOrder>): Promise<IOrder | null> {
  try {
    return await Order.findByIdAndUpdate(
      orderId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    console.error('Error updating order:', error);
    return null;
  }
}

export async function getOrdersByUserId(userId: string): Promise<IOrder[]> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      return [];
    }

    return await Order.find({ userId: user._id }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting orders by user ID:', error);
    return [];
  }
}

// ==================== MESSAGE OPERATIONS ====================

export async function createMessage(userId: string, messageData: {
  targetId: string;
  authorId: string;
  body: string;
}): Promise<IMessage> {
  try {
    const user = await User.findOne({ clientId: userId });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const message = new Message({
      userId: user._id,
      ...messageData,
      comments: [],
      unreadCommentsCount: 0
    });

    await message.save();
    return message;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

export async function addCommentToMessage(messageId: string, commentData: {
  authorId: string;
  body: string;
}): Promise<IMessage | null> {
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return null;
    }

    message.comments.push({
      authorId: commentData.authorId,
      body: commentData.body,
      createdAt: new Date()
    });

    message.unreadCommentsCount += 1;
    await message.save();
    return message;
  } catch (error) {
    console.error('Error adding comment to message:', error);
    return null;
  }
}
