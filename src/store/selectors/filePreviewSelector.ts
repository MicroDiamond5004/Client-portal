import { RootState } from "..";

export const selectFile = (state: RootState) => state.filePreview.file;
export const selectOpenFile = (state: RootState) => state.filePreview.open;

