// store/slices/filePreviewSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SLiceNames } from '../names/names';

interface FileData {
  url: string;
  name: string;
  type: string;
}

interface FilePreviewState {
  file: FileData | null;
  open: boolean;
}

const initialState: FilePreviewState = {
  file: null,
  open: false,
};

const filePreviewSlice = createSlice({
  name: SLiceNames.FILE_PREVIEW,
  initialState,
  reducers: {
    showFilePreview(state, action: PayloadAction<FileData>) {
      state.file = action.payload;
      state.open = true;
    },
    hideFilePreview(state) {
      state.open = false;
      state.file = null;
    },
  },
});

export const { showFilePreview, hideFilePreview } = filePreviewSlice.actions;
export default filePreviewSlice.reducer;
