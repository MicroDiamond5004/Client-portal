import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

export const fetchUserOrders = createAsyncThunk<any>(
  "tickets/fetchUserOrders",
  async () => {
    const { data } = await api.get(`/user/orders`);
    return data;
  }
);
