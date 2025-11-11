import constants from 'constants';
import { User, Order, Message, Subscription, Session, IUser, IOrder, IMessage, ISubscription, ISession, IPassport, Passport, IFilePreview, FilePreview, IAuthor, Author, IChat, Chat, WebsocketSession, IWebsocketSession } from '../models';;
import { getFiles } from '../polling/pollingFunctions';
import { UserData, ELMATicket } from './types';
import mongoose, { Mongoose } from 'mongoose';
import { updateMessageToUser, updateOrderToUser } from '../polling/observer/observer';

// ==================== USER DATA OPERATIONS ====================

export async function addUser(
  userId: string,
  clientName: string,
  email: string,
  password: string,
  company: string
): Promise<IUser | null> {
  try {
    console.log("=> checking existing user");

    const existingUser = await User.findOne({ clientId: userId });

    if (existingUser) {
      let hasChanges = false;

      if (existingUser.clientName !== clientName) {
        existingUser.clientName = clientName;
        hasChanges = true;
      }
      if (existingUser.email !== email) {
        existingUser.email = email;
        hasChanges = true;
      }
      if (existingUser.password !== password) {
        existingUser.password = password;
        hasChanges = true;
      }
      if (existingUser.company !== company) {
        existingUser.company = company;
        hasChanges = true;
      }

      if (hasChanges) {
        console.log("=> updating user");
        await existingUser.save();
      } else {
        console.log("=> no changes detected");
      }

      return existingUser;
    }

    console.log("=> creating new user");
    const user = new User({
      clientId: userId,
      clientName,
      email,
      password,
      company,
    });

    await user.save();

    if (user._id && typeof user._id === "object" && typeof user._id.toString === "function") {
      return user;
    } else {
      throw new Error("User _id is missing or invalid after save.");
    }
  } catch (error) {
    console.error("Error saving user:", error);
    throw error;
  }
}

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
    // Удаляем все предыдущие сессии
    await Session.deleteMany({});

    // Создаём новую сессию
    const session = new Session({
      userId: new mongoose.Types.ObjectId(), // Можно позже заменить на реального пользователя
      token,
      cookie,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа
    });

    console.log("=> Saving new single session");
    await session.save();

    return session?._id?.toString() ?? '';
  } catch (error) {
    console.error("Error saving cookie and token:", error);
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

export async function getCookieAndToken(): Promise<{token: string | undefined, cookie: string | undefined} | null> {
  try {
    const session = await Session.findOne({});
    return {token: session?.token, cookie: session?.cookie};
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

export async function isSessionExpired(token: string): Promise<boolean> {
  await Session.deleteMany({ expiresAt: { $lte: new Date() } });

  const session = await Session.find({token});
  
  if (!!session.at(-1)) {
    return false;
  } 

  return true;
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
  const previousOrder = await Order.findOne({userId, elmaId: orderData.__id});
  
  if (previousOrder) {
    return previousOrder;
  }

  try {
    const order = new Order({
      userId,
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

export async function updateOrder(userId: string, identifier: string, updateData: Partial<IOrder>) {
  try {
    // If it's a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = mongoose.Types.ObjectId.isValid(identifier);

    const filter = isObjectId
      ? { _id: new mongoose.Types.ObjectId(identifier) }
      : { elmaId: identifier }; // your custom field for UUID orders

    const updated = await Order.findOneAndUpdate(
      filter,                                 // ✅ filter object
      { ...updateData, updatedAt: new Date() },
      { new: true }                           // ✅ return updated document
    );

    if (!updated) {
      console.warn("⚠️ Order not found for filter:", filter);
    }

    await updateOrderToUser({userId, order: updated as any, type: 'order:update'});
    return updated;
  } catch (error) {
    console.error("Error updating order:", error);
    return null;
  }
}


export async function getOrdersByUserIdWithLimit(
  clientIds: string | string[],
  page: number = 1,
  limit: number = 20
): Promise<{ orders: IOrder[]; totalCount: number }> {
  try {
    const userIds = Array.isArray(clientIds) ? clientIds : [clientIds];

    const skip = (page - 1) * limit;

    // Fetch in parallel for performance
    const [orders, totalCount] = await Promise.all([
      Order.find({ userId: { $in: userIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as unknown as Promise<IOrder[]>,
      Order.countDocuments({ userId: { $in: userIds } }),
    ]);

    return { orders, totalCount };
  } catch (error) {
    console.error("Error getting paginated orders for users:", error);
    return { orders: [], totalCount: 0 };
  }
}


export async function getOrdersByUserId(userId: string): Promise<IOrder[]> {
  try {
    return await Order.find({ userId }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting orders by user ID:', error);
    return [];
  }
}

// ==================== MESSAGE OPERATIONS ====================
export async function createMessage(userId: string, messageData: {
  __id: string;
  targetId: string;
  authorId: string;
  body: string | null;
  files?: string[]
}): Promise<IMessage | undefined> {
  try {
    const previousMessage = await Message.findOne({__id: messageData.__id, userId});

    if (previousMessage) {
      // console.log(`Order already existing! ===> ${orderData}`);
      return previousMessage;
    }

    const message = new Message({
      ...messageData,
      userId,
      comments: [],
      unreadCommentsCount: 0,
      isChanged: true,
    });

    // updateUserData({userId, message});/

    await message.save();
    return message;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

export async function addCommentToMessage(userId: string, messageId: string, commentData: {
  authorId: string;
  body: string | null;
  files?: string[]
}): Promise<IMessage | null> {
  try {
    const message = await Message.findOne({__id: messageId});

    if (!message) {
      return message;
    }

    message.comments.push({
      authorId: commentData.authorId,
      body: commentData.body,
      createdAt: new Date()
    });

    message.unreadCommentsCount += 1;
    message.isChanged = true;
    await message.save();

    return message;
  } catch (error) {
    console.error('Error adding comment to message:', error);
    return null;
  }
}

export async function getMessagesByUserId(userId: string): Promise<IMessage[]> {
  try {
    return await Message.find({userId}).sort({ createdAt: -1 });
    } catch (error) {
    console.error('Error getting messages by user ID:', error);
    return [];
  }
}

export async function getMessagesByOrderId(userId: string, targetId: string): Promise<IMessage[]> {
  try {
    const messages = await Message.aggregate([
      { $match: { targetId } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$__id", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } }
    ]);

    return messages;
  } catch (error) {
    console.error('Error getting messages by target ID:', error);
    return [];
  }
}


// ==================== MESSAGE OPERATIONS ====================

export async function createPassport(userId: string, passportData: {
  passportId: string;
  name: string;
  passportData: string;
}): Promise<IPassport | null> {
  try {
    const previousPassport = await Passport.findOne({ passportId: passportData.passportId, userId });

    if (previousPassport) {
      // console.log(`Order already existing! ===> ${orderData}`);
      return previousPassport;
    }

    const passport = new Passport({
      userId,
      ...passportData
    });

    // updateUserData({userId, passport});

    await passport.save();
    return passport;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

export async function getPassportsById(userId: string): Promise<IPassport[]> {
  try {
    return await Passport.find({userId}).lean() as unknown as IPassport[];
    } catch (error) {
    console.error('Error getting messages by user ID:', error);
    return [];
  }
}


// ==================== FILE OPERATIONS ====================
export async function createFile(userId: string, fileData: {
  fileId: string,
  filename: string,
  url: string,
}): Promise<IFilePreview | undefined> {
  try {
    const previousFile = await FilePreview.findOne({ userId, fileId: fileData.fileId });

    if (previousFile) {
      // console.log(`Order already existing! ===> ${orderData}`);
      return previousFile;
    }

    const extension = fileData.filename?.split('.').at(-1);

    const file = new FilePreview({
      userId,
      fileId: fileData.fileId,
      fileName: fileData.filename,
      fileType: extension,
      fileUrl: fileData.url,
    });

    // updateUserData({userId, passport});

    await file.save();
    return file;
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
}

export async function getFileById(fileId: string): Promise<IFilePreview | null> {
  try {
    return await FilePreview.findOne({fileId});
  } catch (error) {
    console.error('Error getting file:', error);
    throw error;
  }
} 

// ==================== AUTHOR OPERATIONS ====================

export async function createAuthor(authorData: {
  authorId: string;
  name: string;
}): Promise<IAuthor> {
  const { authorId, name } = authorData;

  const author = await Author.findOneAndUpdate(
    { authorId },
    { $setOnInsert: { name } },
    { new: true, upsert: true }
  );

  return author;
}

export async function getAuthor(authorId: string): Promise<IAuthor | null> {
  try {
    return await Author.findOne({authorId});
  } catch (error){
    console.error('Error getting author:', error);
    throw error;
  }
}

// ==================== CHAT OPERATIONS ====================

export async function getChat(id: string): Promise<IChat | null> {
  try {
    const chat = await Chat.findOne({id});
    return chat;
  } catch (error) {
    console.error('Error getting chat:', error);
    throw error;
  }
}

export async function createChat(chatData: {
  name: string,
  taskId: string,
}): Promise<IChat | null> {
  const previousChat = await Chat.findOne({name: chatData.name});
  if (previousChat) {
    return previousChat;
  }

  const chat = new Chat({
    id: chatData.name,
    name: chatData.name,
    taskId: chatData.taskId,
    isChanged: true
  })

  await chat.save();
  return chat;
}
 

// ==================== WEB SOCKET SEESION OPERATIONS ====================

/**
 * Get websocket session by ID
 */

export async function getWebsocketSessionsByUserId(userId: string): Promise<IWebsocketSession[] | null> {
  try {
    return await WebsocketSession.find({ userId });
  } catch (error) {
    console.error("Error getting websocket session:", error);
    throw error;
  }
}

export async function getWebsocketSession(id: string): Promise<IWebsocketSession | null> {
  try {
    return await WebsocketSession.findOne({ id });
  } catch (error) {
    console.error("Error getting websocket session:", error);
    throw error;
  }
}

/**
 * Create or update websocket session by ID
 */
export async function createWebsocketSession(
  websocketSessionData: IWebsocketSession
): Promise<IWebsocketSession | null> {
  try {
    const session = await WebsocketSession.findOneAndUpdate(
      { id: websocketSessionData.id },
      { $set: websocketSessionData },
      { new: true, upsert: true } // new = return updated doc, upsert = create if not exists
    );
    return session;
  } catch (error) {
    console.error("Error creating/updating websocket session:", error);
    throw error;
  }
}

/**
 * Delete websocket session by ID
 */
export async function deleteWebsocketSession(id: string): Promise<IWebsocketSession | null> {
  try {
    return await WebsocketSession.findOneAndDelete({ id });
  } catch (error) {
    console.error("Error deleting websocket session:", error);
    throw error;
  }
}


// ------------ Update isChange function --------------
export async function updateIsChangedByType(
  userId: string,
  elementId: string,
  type: 'order' | 'message',
  isChanged: boolean
): Promise<IOrder | IMessage[] | null> {
  if (type === 'order') {
  const updatedOrder = await Order.findOneAndUpdate(
    { userId, elmaId: elementId },
    {
      $set: {
        isChanged,               // top-level field
        'orderData.isChanged': isChanged, // nested field inside orderData
      },
    },
    { new: true, upsert: false } // upsert: false ensures it doesn't create a new doc accidentally
  );

  return updatedOrder;
}

  // For messages — update many
  await Message.updateMany(
    { targetId: elementId },
    { $set: { isChanged } }
  );

  // Return updated messages if needed
  const updatedMessages = await Message.find({ userId, elementId });
  return updatedMessages;
}