export interface ElmaData {
  id: number;
  title: string;
  content: {
    text: string;
    type: 'message' | 'order';
  };
}
