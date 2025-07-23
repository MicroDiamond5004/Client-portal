import { Paper, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useEffect, useState } from "react";
import api from "src/store/api";
import { FileListBlock } from "../fileList/FileListBlock";

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
        <Typography variant="h5" mb={2}>
          Карта мест
        </Typography>
        {ticket.opisanie_stoimosti_mest && (
          <Typography mb={1}>
            <strong>Описание стоимости мест:</strong>{" "}
            {ticket.opisanie_stoimosti_mest}
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
