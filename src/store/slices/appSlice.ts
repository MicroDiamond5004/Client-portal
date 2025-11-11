// store/slices/appSlice.ts
import { createSlice } from '@reduxjs/toolkit';

interface InitialStorage {
  currentPath: Location;
  previousPath: Location | null;
}


const initialState: InitialStorage = {
  currentPath: window.location,
  previousPath: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setPath: (state, action) => {
      state.previousPath = state.currentPath;
      state.currentPath = action.payload;
    },
  },
});

export const { setPath } = appSlice.actions;
export default appSlice.reducer;
