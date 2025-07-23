// components/CustomEvent.tsx
export const CustomEvent = ({ event }: { event: any }) => (
  <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', textWrap: 'wrap' }}>
    {`${event.title?.split('(')?.[0]} ${(event.fios?.length ?? 0) > 1 ? `${event.fios?.[0]}+${(event.fios?.length ?? 1) - 1}` : event.fios}`}
  </div>
);
