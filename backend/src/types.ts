export interface ElmaData {
  id: number;
  title: string;
  content: {
    text: string;
    type: 'message' | 'order';
  };
}

export interface UploadedFileMetadata {
  hash: string;
  size: number;
  __id: string;
  __name: string;
}
