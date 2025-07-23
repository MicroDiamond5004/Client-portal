import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogActions, Button, IconButton,
  Typography, Stack, Box,
} from '@mui/material';
import { Document, Page } from 'react-pdf';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'src/store';
import { hideFilePreview } from 'src/store/slices/filePreviewSlice';
import {
  IconChevronLeft, IconChevronRight, IconDownload, IconShare, IconX
} from '@tabler/icons-react';
import { useAppSelector } from 'src/store/hooks';
import { selectFile, selectOpenFile } from 'src/store/selectors/filePreviewSelector';
import api from 'src/store/api';

const FilePreviewDialog = () => {
  const dispatch = useDispatch();
  const file = useAppSelector(selectFile);
  const open = useAppSelector(selectOpenFile);

  const [pageNumber, setPageNumber] = React.useState(1);
  const [numPages, setNumPages] = React.useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  useEffect(() => {
    if (file) {
    const fetchPreviewUrl = async() => {
        const res = await api.post('/generate-preview', {...file, id: Math.floor(Math.random() * 100000).toString()})
        const data = await res.data;
        // console.log(data.previewUrl);
        setPreviewUrl(data.previewUrl);
    };

    fetchPreviewUrl();
  }
  }, [file])

  useEffect(() => {
    if (file?.name.includes('pdf')) {
      setPageNumber(1);
    }
  }, [file]);

  const handleClose = () => dispatch(hideFilePreview());

  const memoizedFile = useMemo(() => ({ url: file?.url || '' }), [file]);

  if (!file) return null;

  const handleShare = () => {
  const previewUrl = `${window.location.origin}/preview/${file.name}`;

  if (navigator.share) {
    navigator
      .share({
        title: file.name,
        text: 'Посмотрите файл',
        url: previewUrl,
      })
      .catch((err) => {
        if (err.name !== 'AbortError') alert('Не удалось поделиться');
      });
  } else {
    navigator.clipboard.writeText(previewUrl);
    alert('Ссылка скопирована!');
  }
};


  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      {/* Верхняя кнопка закрытия */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'background.paper',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button onClick={handleClose} startIcon={<IconX />} variant="outlined">
          Закрыть
        </Button>
      </Box>

      {/* Основной контент */}
      <DialogContent
        dividers
        sx={{
          textAlign: 'center',
          maxHeight: '70vh',
          overflow: 'auto',
        }}
      >
        {file.name.includes('pdf') ? (
          <>
            <Document
              file={memoizedFile}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading="Загрузка PDF..."
            >
              <Page pageNumber={pageNumber} />
            </Document>

            <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} mt={2}>
              <IconButton
                onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
              >
                <IconChevronLeft />
              </IconButton>
              <Typography>
                Страница {pageNumber} из {numPages}
              </Typography>
              <IconButton
                onClick={() => setPageNumber((prev) => Math.min(prev + 1, numPages))}
                disabled={pageNumber >= numPages}
              >
                <IconChevronRight />
              </IconButton>
            </Stack>
          </>
        ) : ['.png', '.jpeg', '.jpg', '.webp', '.tif'].some((ext) => file.name.includes(ext)) ? (
          <img
            src={file.url}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }}
          />
        ) : (
          <Typography variant="h6" gutterBottom>
            📄 {file.name}
          </Typography>
        )}
      </DialogContent>

      {/* Нижняя панель с кнопками */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          backgroundColor: 'background.paper',
          px: 2,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<IconDownload />}
          href={file.url}
          download={file.name}
        >
          Скачать
        </Button>

        <Button
          variant="contained"
          color="info"
          startIcon={<IconShare />}
          onClick={() => {
            if (navigator.share && previewUrl) {
              navigator
                .share({
                  title: file.name,
                  text: `Посмотрите файл ${file.name}`,
                  url: previewUrl ?? '',
                })
                .catch((error) => {
                  if (error.name !== 'AbortError') {
                    console.error('Ошибка при попытке поделиться:', error);
                    alert('Не удалось поделиться. Попробуйте снова.');
                  }
                });
            } else {
              navigator.clipboard
                .writeText(previewUrl ?? '')
                .then(() => alert('Ссылка скопирована!'))
                .catch(() => alert('Ошибка копирования.'));
            }
          }}
        >
          Поделиться
        </Button>
      </Box>
    </Dialog>
  );


};

export default FilePreviewDialog;
