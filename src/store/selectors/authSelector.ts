import { RootState } from "..";

export const selectToken = (state: RootState) => state.auth.token;
export const selectTokenError = (state: RootState) => state.auth.error;
export const selectClientName = (state: RootState) => state.auth.clientName;
export const selectContragent = (state: RootState) => state.auth.contragent;
export const selectContragentId = (state: RootState) => state.auth.contragentId;
export const selectClientId = (state: RootState) => state.auth.clientId;
export const selecttClientFio = (state: RootState) => state.auth.clientFio;
export const selecttClientEmail = (state: RootState) => state.auth.email;
export const selecttClientPhone = (state: RootState) => state.auth.phone;
export const selectSubscription  = (state: RootState) => state.auth.subscription;
