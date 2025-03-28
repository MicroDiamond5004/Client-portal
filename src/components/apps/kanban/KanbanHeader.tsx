import { useState, useContext } from 'react';
import { KanbanDataContext } from 'src/context/kanbancontext/index';

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  Box,
  Grid2 as Grid,
} from '@mui/material';
import CustomFormLabel from '../../forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../forms/theme-elements/CustomTextField';
import { IconBox, IconBoxMultiple4, IconClipboardList, IconLayoutList, IconList, IconListDetails, IconListTree } from '@tabler/icons-react';
import { Stack, styled } from '@mui/system';


const BoxStyled = styled(Box)(() => ({
  transition: '0.1s ease-in',
  cursor: 'pointer',
  color: 'inherit',
  backgroundColor: '#5D87FF',
  '&:hover': {
    transform: 'scale(1.03)',
    backgroundColor: '#1245d6',
  },
}));

type KandanHeaderProps = {
  changeView: (isList: boolean) => void,
}

function KanbanHeader(props: KandanHeaderProps) {
  const {changeView} = props;
  const { setError } = useContext(KanbanDataContext);
  const [show, setShow] = useState(false);
  const [listName, setListName] = useState('');

  //Closes the modal
  const handleClose = () => setShow(false);
  //open the modal
  const handleShow = () => setShow(true);

  //Handles Add a new category.
  // const handleSave = async () => {
  //   try {
  //     setListName('');
  //     setShow(false);
  //   } catch (error: any) {
  //     setError(error.message);
  //   }
  // };

  const isAddButtonDisabled = listName.trim().length === 0;

  return (<>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
      <Typography variant="h5">Все Заказы</Typography>
      <Grid size={{
          lg: 6,
          sm: 6,
          xs: 6
        }}>
          <Box bgcolor="white" p={0}>
          <Stack direction="row" gap={2} alignItems="center" justifyContent='flex-end'>
            <Box>
              <Typography variant="h4">Вид:</Typography>
            </Box> 
            <BoxStyled 
              onClick={() => changeView(true)}
              width={38}
              height={38}
              bgcolor="primary.main"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Typography
                color="primary.contrastText"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <IconLayoutList width={22} />
              </Typography>
            </BoxStyled>
          </Stack>
        </Box>
      </Grid>
    </Box>
    <Dialog
      open={show}
      onClose={handleClose}
      maxWidth="lg"
      sx={{ '.MuiDialog-paper': { width: '600px' } }}
    >
      <DialogTitle>Add List</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              lg: 12
            }}>
            <CustomFormLabel htmlFor="default-value">List Name</CustomFormLabel>
            <CustomTextField
              autoFocus
              id="default-value"
              variant="outlined"
              value={listName}
              fullWidth
              onChange={(e: any) => setListName(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      {/* <DialogActions>
        <Button variant="outlined" onClick={handleClose} color="error">
          Cancel
        </Button>
        <Button
          variant="contained"
          // onClick={handleSave}
          color="primary"
          disabled={isAddButtonDisabled}
        >
          Add List
        </Button>
      </DialogActions> */}
    </Dialog>
  </>);
}
export default KanbanHeader;
