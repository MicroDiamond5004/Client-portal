import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs';

const PdfViewer = ({ fileUrl }: { fileUrl: string }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  console.log(fileUrl);

  const fetchPdf = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (error) {
      console.error('Ошибка загрузки PDF:', error);
    }
  };

  useEffect(() => {
    fetchPdf();
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileUrl]);

  if (!blobUrl) return <div>Загрузка...</div>;

  return (
    <Document
      file={blobUrl}
      loading="Загрузка документа..."
      error="Ошибка загрузки файла"
    >
      <Page pageNumber={1} />
    </Document>
  );
};

export default PdfViewer;
