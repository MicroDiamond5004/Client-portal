// storeRef.ts
import { Store } from '@reduxjs/toolkit';
let _store: Store | null = null;

export const setStore = (store: Store) => {
  _store = store;
};

export const getStore = () => {
  if (!_store) throw new Error('Store is not set yet!');
  return _store;
};
