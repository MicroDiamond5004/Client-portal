// src/store/middleware/apiMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '..';

export const apiMiddleware: Middleware<{}, RootState> = store => next => (action: any) => {
  if (typeof action === 'function') {
    return next(action);
  }

  if (action.meta?.isApiCall && action.meta.url) {
    const token = store.getState().auth.token;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    fetch(action.meta.url, {
      method: action.meta.method || 'GET',
      headers,
      body: action.payload ? JSON.stringify(action.payload) : undefined,
    })
      .then(async response => {
        const data = await response.json();
        store.dispatch({
          type: `${action.type}_SUCCESS`,
          payload: data,
        });
      })
      .catch(error => {
        store.dispatch({
          type: `${action.type}_ERROR`,
          error: error.message,
        });
      });

    return;
  }

  return next(action);
};
