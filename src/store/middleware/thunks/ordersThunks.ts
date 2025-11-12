import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";
import { RootState } from "src/store";
import { sendOrderIdsToWebSocket } from "src/websocket";
import { ELMATicket } from "src/data/types";

export const fetchUserOrders = createAsyncThunk<
  any,                // return type (what your thunk returns)
  void,               // argument type (since you don't pass any args)
  { state: RootState } // thunkAPI type
>(
  "tickets/fetchUserOrders",
  async (_value, { getState }) => {
    const state = getState();

    // const limit = state.tickets.limit;
    // const page = state.tickets.page;
    const type = state.tickets.ordersType;

    const { data } = await api.get(`/user/orders?type=${type}`);

    return data;
  }
);

export const fetchOrderData = createAsyncThunk<
  any,                // return type (what your thunk returns)
  string               // argument type (since you don't pass any args)
>(
  "tickets/fetchOrderData",
  async (id) => {

    const { data } = await api.get(`/user/order/${id}`);

    return data;
  }
);
