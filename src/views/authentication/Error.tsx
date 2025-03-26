import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router';
import ErrorImg from 'src/assets/images/backgrounds/errorimg.svg';

const Error = () => (
  <Box
    display="flex"
    flexDirection="column"
    height="100vh"
    textAlign="center"
    justifyContent="center"
  >
    <Container maxWidth="md">
      <img src={ErrorImg} alt="404" />
      <Typography align="center" variant="h1" mb={4}>
        Уупс!!!
      </Typography>
      <Typography align="center" variant="h4" mb={4}>
        Извините, мы не смогли найти эту страницу!
      </Typography>
      <Button
        color="primary"
        variant="contained"
        component={Link}
        to="/"
        disableElevation
      >
        Вернуться к билетам
      </Button>
    </Container>
  </Box>
);

export default Error;
