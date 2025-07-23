import { amber, blue, deepPurple, green, indigo, pink, teal } from '@mui/material/colors';
 
export const getColorByLetter = (letter: string): string => {
  const colors = [deepPurple[500], pink[500], indigo[500], teal[500], amber[700], green[600], blue[500]];
  const index = letter?.toUpperCase()?.charCodeAt(0) % colors.length;
  return colors[index];
};