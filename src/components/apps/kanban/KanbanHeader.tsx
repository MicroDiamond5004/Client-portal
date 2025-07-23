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
  Grid,
} from '@mui/material';
import CustomFormLabel from '../../forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../forms/theme-elements/CustomTextField';
import { IconBox, IconBoxMultiple4, IconClipboardList, IconLayoutList, IconList, IconListDetails, IconListTree, IconPlus } from '@tabler/icons-react';
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
  addTask: (isNew: boolean) => void,
}

function KanbanHeader(props: KandanHeaderProps) {
  const {changeView, addTask} = props;
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
    <Box mb={4}>
  <Grid container alignItems="center" spacing={2}>
    {/* Заголовок слева */}
    <Grid xs={12} sm={6}>
      {/*<Typography variant="h5">Все Заказы</Typography>*/}
    </Grid>

    {/* Кнопка и переключатель строго справа */}
    <Grid xs={12} sm={6}>
      <Box bgcolor="white">
        <Box
          display="flex"
          justifyContent="flex-end"
          flexWrap="wrap"
          gap={2}
        >
          <BoxStyled
            onClick={() => addTask(true)}
            sx={{
              px: 2,
              height: 38,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              color="primary.contrastText"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              СОЗДАТЬ ЗАКАЗ
            </Typography>
            <Typography
              ml={1}
              color="primary.contrastText"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <IconPlus size={22} />
            </Typography>
          </BoxStyled>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h4">Вид:</Typography>
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
      </Box>
    </Grid>
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
              xs={12}
              lg={12}>
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
