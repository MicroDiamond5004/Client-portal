import { Typography, Paper, Stack, Box } from "@mui/material";
import React from "react";
import { useAppDispatch } from "src/store/hooks";
import { showFilePreview } from "src/store/slices/filePreviewSlice";
import { IconEye } from "@tabler/icons-react";

type FileItem = {
  fileId: string;
  filename: string;
  url: string;
};

type FileListBlockProps = {
  title?: string;
  files: FileItem[];
  originalFiles: string[];
};

const pdfIconUrl = `data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20clip-path='url(%23clip0_631_1669)'%3e%3cpath%20d='M23.993%200H0.00703125C0.003148%200%200%200.003148%200%200.00703125V23.993C0%2023.9969%200.003148%2024%200.00703125%2024H23.993C23.9969%2024%2024%2023.9969%2024%2023.993V0.00703125C24%200.003148%2023.9969%200%2023.993%200Z'%20fill='%23ED2224'/%3e%3cpath%20d='M13.875%205.625L19.2188%2018.375V5.625H13.875ZM4.78125%205.625V18.375L10.125%205.625H4.78125ZM9.70312%2015.7969H12.1406L13.2188%2018.375H15.375L11.9531%2010.2656L9.70312%2015.7969Z'%20fill='white'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_631_1669'%3e%3crect%20width='24'%20height='24'%20rx='3'%20fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e`;

export const FileListBlock: React.FC<FileListBlockProps> = ({
                                                              title = "Файлы",
                                                              files,
                                                              originalFiles,
                                                            }) => {
  const dispatch = useAppDispatch();

  const handleViewFile = (file: FileItem) => {
    dispatch(
      showFilePreview({
        url: file.url ?? "",
        name: decodeURIComponent(file.filename ?? "Файл"),
        type: "",
      })
    );
  };

  if (!originalFiles || originalFiles.length === 0) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        my: 2,
        borderRadius: 2,
        backgroundColor: "#f9f9f9",
      }}
    >
      <Typography variant="h5" sx={{ mb: 2 }}>
        {title}
      </Typography>

      <Stack spacing={1}>
        {originalFiles.map((fileId: string) => {
          const file = files.find((el) => el.fileId === fileId);
          if (!file) return null;

          const decodedName = decodeURIComponent(file.filename ?? "Файл");

          return (
            <Stack
              key={file.fileId}
              direction="row"
              gap={2}
              alignItems="center"
              onClick={() => handleViewFile(file)}
              sx={{
                cursor: "pointer",
                px: 1,
                py: 1,
                borderRadius: 1,
                transition: "background-color 0.2s",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                },
              }}
            >
              <Box
                component="img"
                src={pdfIconUrl}
                alt="PDF icon"
                sx={{ width: 40, height: 40, flexShrink: 0 }}
              />

              <Box flexGrow={1} overflow="hidden">
                <Typography noWrap>{decodedName}</Typography>
              </Box>

              <IconEye stroke={1.5} size="20" color="#1976d2" />
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
};
