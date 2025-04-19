type attachType = {
  icon?: string;
  file?: string;
  fileSize?: string;
};

export type MessageType = {
  createdAt?: any;
  msg: string;
  senderId: number | string;
  type: 'text' | 'file' | 'image';
  attachment: attachType[];
  id: string;
};

export interface ChatsType {
  id: string | number;
  taskId: string;
  name: string;
  status: string;
  recent: boolean;
  excerpt: string;
  chatHistory?: any[];
  messages: MessageType[];
  thumb?: string,
}

export interface ChatMessage {
  attachment: string[],
  createdAt: string,
  id: string,
  msg: string,
  senderId: number,
  type: 'text' | 'file' | 'img';
}
