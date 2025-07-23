import { RootState } from 'src/store';

export const selectPath = (state: RootState) => state.app.currentPath;
export const selectPrevPath = (state: RootState) => state.app.previousPath;