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
  comments?: any[];
  files?: any[];
  author: string;
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
  isChanged?: boolean;
}

export interface ChatMessage {
  attachment: string[],
  createdAt: string,
  id: string,
  msg: string,
  senderId: number,
  type: 'text' | 'file' | 'img';
  comments: any[];
  author: string;
  files: any[]
  messageId?: string;
}

export interface ELMAChat {
  author: string; // UUID
  body: string; // например, "15.04.2025 13:25"
  comments: any[]; // если известно, какая структура у комментариев — уточни
  target: {
    code: string; // "OrdersNew"
    createdIn: any[]; // тоже можно уточнить тип
    id: string; // UUID
    namespace: string; // "work_orders"
    title: string; // "#569 - ООО \"Михайлова Юлия Геннадьевна\""
  };
  title: string; // "Процесс \"Трансфер\" запущен"
  unreadCommentsCount: number;
  __createdAt: string; // ISO дата
  __deletedAt: string | null;
  __id: string; // UUID
  __updatedAt: string; // ISO дата
}
