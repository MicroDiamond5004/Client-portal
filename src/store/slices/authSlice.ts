import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { SLiceNames } from "../names/names"
import { getContragent } from "../middleware/thunks/contragentThunks"
import { checkAndRefreshToken, fetchAuthToken, refreshAuthToken } from "../middleware/thunks/tokenThunks"
import { logoutAll } from '../middleware/thunks';

interface AuthState {
  token: string | null;
  error: string | null;
  clientName: string | null;
  contragent: string | null;
  clientId: string | null;
  clientFio: {
    firstName: string;
    lastName: string;
    middleName: string;
  } | null
  contragentId?: string;
  email?: string;
  phone?: string;
  subscription?: any;
}

const initialState: AuthState = {
  token: localStorage.getItem("auth_token") || null,
  error: null,
  clientName: '',
  contragent: null,
  clientId: null,
  clientFio: null,
  contragentId: '',
  subscription: localStorage.getItem('push') || null,
}

const authSlice = createSlice({
  name: SLiceNames.AUTH,
  initialState,
  reducers: {
    logout: (state) => {
        state.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('cookie');
    },
    setClient: (state, action) => {
      state.clientId = action.payload.userId;
      state.clientFio = action.payload.fio;
      state.email = action.payload.email;
      state.phone = action.payload.phone;
    },
    setSubscription: (state, action) => {
      console.log(action.payload);
      state.subscription = action.payload;
      localStorage.setItem('push', JSON.stringify(action.payload));
    },
    removeSubscription: (state, action) => {
      state.subscription = null;
      localStorage.setItem('push', JSON.stringify({}));
    },
  },
  extraReducers: (builder: any) => {
    builder
      .addCase(logoutAll.fulfilled, (state) => {
          state.token = null;
          state.error = null;
          state.clientName = '';
          state.contragent = null;
          state.clientId = null;
          state.clientFio = null;
          state.contragentId = '';
          state.cookie = '';
      })
      .addCase(fetchAuthToken?.fulfilled, (state: AuthState, action: any) => {
        state.token = action.payload.token;
        state.clientName = action.payload.clientName;
        console.log(action.payload);
        state.error = null;
      })
      .addCase(fetchAuthToken.rejected, (state: AuthState, action: any) => {
        state.error = action.payload as string;
      })
      .addCase(refreshAuthToken.fulfilled, (state: AuthState, action: any) => {
        state.token = action.payload;
        state.error = null;
      })
      .addCase(refreshAuthToken.rejected, (state: AuthState, action: any) => {
        state.error = action.payload as string;
      })
      .addCase(checkAndRefreshToken.fulfilled, (state: AuthState, action: any) => {
        state.token = action.payload;
        state.error = null;
      })
      .addCase(checkAndRefreshToken.rejected, (state: AuthState, action: any) => {
        state.error = action.payload as string;
      })
      .addCase(getContragent.fulfilled, (state: AuthState, action: any) => {
        state.contragent = action.payload.contragent;
        state.contragentId = action.payload.contragentId;
      })
    }
})

export const { logout, setClient, setSubscription, removeSubscription } = authSlice.actions;
export default authSlice.reducer;