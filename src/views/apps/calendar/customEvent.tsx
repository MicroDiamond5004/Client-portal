// components/CustomEvent.tsx
import { Box } from '@mui/material';

export const CustomEvent = ({ event }: { event: any }) => (
  <Box style={{ whiteSpace: 'normal', wordWrap: 'break-word', textWrap: 'wrap', borderRadius: '5px' }}>
    {`${event.title?.split('(')?.[0]} ${(event.fios?.length ?? 0) > 1 ? `${event.fios?.[0]}+${(event.fios?.length ?? 1) - 1}` : event.fios}`}
  </Box>
);
