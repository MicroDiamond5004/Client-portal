import { configureStore } from '@reduxjs/toolkit';
import messagesReducer from './slices/messageSlice';
import ticketsReducer from './slices/ticketsSlice';
import authReducer from './slices/authSlice'
import filePreviewReducer from './slices/filePreviewSlice'
import appReducer from './slices/appSlice';

import { setStore } from './storeRef';


export const store = configureStore({
  reducer: {
    messages: messagesReducer,
    tickets: ticketsReducer,
    auth: authReducer,
    filePreview: filePreviewReducer,
    app: appReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
  devTools: true,
});

setStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
