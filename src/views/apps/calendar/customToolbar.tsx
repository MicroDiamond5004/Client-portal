// components/CustomToolbar.tsx
import { Box, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

type CustomToolbarProps = {
  label: string;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
};

const CustomToolbar = ({ label, onNavigate }: CustomToolbarProps) => (
  <Box
    display="flex"
    position="sticky"
    top={0}
    zIndex={1}
    justifyContent="space-between"
    alignItems="center"
    py={2}
    px={3}
    sx={{
      backgroundColor: '#f8f8f8',
      borderRadius: 2,
      mb: 2,
    }}
  >
    <IconButton onClick={() => onNavigate('PREV')}>
      <ChevronLeft />
    </IconButton>
    <Typography variant="h6" fontWeight="bold">{label}</Typography>
    <IconButton onClick={() => onNavigate('NEXT')}>
      <ChevronRight />
    </IconButton>
  </Box>
);

export default CustomToolbar;
