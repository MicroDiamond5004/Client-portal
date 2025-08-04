import { Chip, Paper, Typography } from '@mui/material';
import { Box } from "@mui/system";
import React, { Fragment, useEffect, useState } from 'react';
import api from "src/store/api";
import { FileListBlock } from "../fileList/FileListBlock";
import formatToRussianDate from 'src/help-functions/format-to-date.ts';

type MapBlockProps = {
  ticket: any;
};

export const MapBlock: React.FC<MapBlockProps> = ({ ticket }) => {
  const [files, setFiles] = useState<any[]>([]);

  const allFiles = ticket.karta_mest_f || [];

  useEffect(() => {
    const fetchFiles = async () => {
      if (allFiles.length > 0) {
        const response = await api.post("/get-files", {
          fileIds: allFiles.map((file: any) => file.__id),
        });

        if (response.data.success) {
          const fetchedFiles: any[] = response.data.files;
          if (fetchedFiles.length !== files.length) {
            setFiles(fetchedFiles);
          }
        } else {
          console.error("Ошибка на сервере:", response.data.error);
        }
      }
    };

    fetchFiles();
  }, [allFiles]);

  const hasData = ticket.opisanie_stoimosti_mest || files.length > 0;

  if (!hasData) {
    return (
      <Paper sx={{ p: 3, my: 2, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
        <Typography>Нет данных по карте</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper
        elevation={3}
        sx={{ p: 3, my: 2, borderRadius: 2, backgroundColor: "#f9f9f9" }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: {
              xs: 'column', // для мобильных (xs и меньше)
              sm: 'row',    // от sm и выше — в строку
            },
            justifyContent: 'space-between',
            gap: 0,
          }}
        >
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={formatToRussianDate(ticket?.__updatedAtMap, 'd MMMM yyyy / HH:mm')}
            sx={{ mt: 0.5, mb: 2 }}
          />
        </Box>
        {ticket.opisanie_stoimosti_mest && (
          <Typography mb={1}>
            <strong>Описание стоимости мест:</strong>{" "}
            {ticket.opisanie_stoimosti_mest ? ticket.opisanie_stoimosti_mest.split('\n').map((line: string, i: number) => (
                <Fragment key={i}>
                  {line}
                  <br />
                </Fragment>
              ))
              : null}
          </Typography>
        )}
        {files.length > 0 && (
          <FileListBlock
            title="Файлы"
            files={files}
            originalFiles={allFiles}
          />
        )}
      </Paper>
    </Box>
  );
};
