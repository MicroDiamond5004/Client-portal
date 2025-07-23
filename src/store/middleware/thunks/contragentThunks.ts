import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";


export const getContragent = createAsyncThunk<string, void>(
  "auth/getContragent",
  async () => {
    const { data } = await api.get('/getContragent');
    return data;
  }
);