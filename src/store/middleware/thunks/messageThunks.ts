import { createAsyncThunk } from "@reduxjs/toolkit";
import { method } from "lodash";
import { ELMATicket } from "src/mocks/tickets/ticket.type";
import { ELMAChat } from "src/types/apps/chat";
import api from "../../api";
import { updateAllMessages } from 'src/store/slices/messageSlice.ts';
import { RootState } from "src/store";


function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}


export const fetchMessages = createAsyncThunk<ELMAChat[], string, {state: RootState}>(
  "messages/fetchMessages",
  async (id, { dispatch, getState }) => {

    const state = getState();
    const limit = state.tickets.limit;
    const page = state.tickets.page;
    const type = state.tickets.ordersType;

    const { data } = await api.get<ELMAChat[]>(`/proxy/543e820c-e836-45f0-b177-057a584463b7/${id}?type=${type}`);

    dispatch(updateAllMessages(data));
  
    return data;
  }
);

export const sendMessage = createAsyncThunk<
  ELMAChat,
  { id: string; text: string; orderNumber: string; files: File[]; url: string, userId: string },
  { rejectValue: string }
>(
  "messages/sendMessage",
  async ({ id, text, orderNumber, files, url }, { requestId }) => {
    const tempId = `temp_${requestId}`; // use built-in unique requestId from Redux Toolkit

    const fileData = await Promise.all(
      files.map(async (file) => {
        const base64 = await toBase64(file);
        return {
          name: file.name,
          type: file.type,
          content: base64.split(",")[1],
        };
      })
    );

    const response = await api.post(
      `/proxy/send/${id}`,
      {
        userId: "543e820c-e836-45f0-b177-057a584463b7",
        orderNumber,
        body: `${text}`,
        href: `<a href='${url}'>Перейти в заказ ${orderNumber}</a>`,
        mentionIds: [],
        files: fileData,
        tempId // optional: send it to backend if you want round-trip mapping
      },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) throw new Error("Failed to send message");

    return { ...response.data, tempId }; // keep tempId for mapping in fulfilled
  }
);

export const sendComment = createAsyncThunk<
  ELMAChat,
  { id: string; text: string, files: File[] }
>(
  "messages/sendComment",
  async ({ id, text, files}) => {

    const fileData = await Promise.all(
      files.map(async (file) => {
        const base64 = await toBase64(file);
        return {
          name: file.name,
          type: file.type,
          content: base64.split(",")[1], // без `data:<type>;base64,`
        };
      })
    );

    const response = await api.post(
      `/addComment/${id}`,
      {
        body: `${text}`,
        mentionIds: [],
        files: fileData,
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (response.status !== 201) {
      throw new Error("Failed to send message");
    }

    return response.data;
  }
);