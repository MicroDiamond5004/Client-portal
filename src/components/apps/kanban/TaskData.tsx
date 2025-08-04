
import React, {  useEffect, useState } from 'react';
import { IconPencil, IconDotsVertical, IconCalendar, IconArrowsDiagonal } from '@tabler/icons-react';
import EditTaskModal from './TaskModal/EditTaskModal';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {
  Box,
  Chip,
  IconButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography, useTheme,
} from '@mui/material';
import BlankCard from '../../shared/BlankCard';
import dayjs from 'dayjs';
import ModalTicket from '../tickets/modal-ticket/modal-ticket';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { useSearchParams } from 'react-router';
import formatToRussianDate from 'src/help-functions/format-to-date';
import api from 'src/store/api';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks';
import edit from 'src/views/apps/invoice/Edit.tsx';
import { uniqueId } from 'lodash';
import { selectPassports } from 'src/store/selectors/ticketsSelectors.ts';
import { useMediaQuery } from '@mui/system';


interface TaskDataProps {
  task: ELMATicket;
  index: number;
  category: any;
  tickets: ELMATicket[];
  openModalTicket: (id: string) => void;
}
const TaskData = ({ task, index, category, tickets, openModalTicket }: TaskDataProps) => {
  const [isShowModal, setIsShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedTask, setEditedTask] = useState<ELMATicket>(task);
  const [anchorEl, setAnchorEl] = useState(null);

  const dispatch = useAppDispatch();

  const handleShowEditModal = () => {
    handleClose();
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => setShowEditModal(false);

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const passports = useAppSelector(selectPassports) ?? {};

  const info = editedTask.otvet_klientu1
    ? `${editedTask.otvet_klientu1}`
    : editedTask.zapros;

  // const handleSaveEditedTask = async (editedTaskData: { id: any }) => {
  //   try {
  //     const response = await mutate('/api/kanban/edit-task', patchFetcher("/api/kanban/edit-task", {
  //       taskId: editedTaskData.id,
  //       newData: editedTaskData,
  //     }), false);
  //     if (response.status === 200) {
  //       setEditedTask(editedTaskData);
  //       let remainingTodos = todoCategories.map((item) => {
  //         if (item.name === category.name) {
  //           let updatedChild = item.child.map((task) => {
  //             if (task.id === editedTaskData.id) {
  //               return { ...task, editedTaskData }
  //             } return task
  //           });
  //           return { id: item.id, name: item.name, child: updatedChild }
  //         } else {
  //           return item
  //         }
  //       });
  //       setTodoCategories(remainingTodos);
  //     } else {
  //       throw new Error("Failed to edit task");
  //     }
  //   } catch (error: any) {
  //     setError(error.message);
  //   }
  // };

  // Function to format the date as 'DD MMM' (Day and Month)
  const formatDate = (date: string | undefined) => {
    if (date) {
      // If the date is provided, format it to 'DD MMM' (Day and Month)
      const parsedDate = dayjs(date, "DD MMMM", true); // strict parsing mode
      if (parsedDate.isValid()) {
        return parsedDate.format("DD MMM");
      } else {
        // If invalid, try to append the current year
        const currentYear = dayjs().year();
        const newDate = `${date} ${currentYear}`; // Example: '24 july 2025'
        const correctedDate = dayjs(newDate, "DD MMMM YYYY");
        return correctedDate.isValid() ? correctedDate.format("DD MMM") : dayjs().format("DD MMM");
      }
    } else {
      // If the date is not provided, return today's date in 'DD MMM' format
      return dayjs().format("DD MMM");
    }
  };

  const taskDate = formatDate(editedTask.__updatedAt ?? editedTask.__createdAt ?? ''); // Get formatted task date

  const backgroundColor ='success.main';
  //   editedTask?.taskProperty === 'Design'
  //     ? 'success.main'
  //     : editedTask?.taskProperty === 'Development'
  //       ? 'warning.main'
  //       : editedTask?.taskProperty === 'Mobile'
  //         ? 'primary.main'
  //         : editedTask?.taskProperty === 'UX Stage'
  //           ? 'warning.main'
  //           : editedTask?.taskProperty === 'Research'
  //             ? 'secondary.main'
  //             : editedTask?.taskProperty === 'Data Science'
  //               ? 'error.main'
  //               : editedTask?.taskProperty === 'Branding'
  //                 ? 'success.main'
  //                 : 'primary.contrastText';

  const handleTicketClick = () => {
    const id = editedTask.nomer_zakaza;
    if (id) {
      openModalTicket(id);
      if (editedTask.isChanged) {
        const updateChange = async () => {
            await api.post('/updateChange', {
            type: 'order',
            id: editedTask.__id,
            });
            dispatch(fetchUserOrders());
          }

          updateChange();
      }
    }
  }

  return (
    <React.Fragment>
    <Box onClick={handleTicketClick}>
      {[1].map((provided: any, index) => (
        <Box key={index}
          mb={3}
          ref={provided.innerRef}
        >
          <Box sx={{
            background: editedTask.isChanged
              ? 'linear-gradient(-45deg, #ff7e5f, #ff3f8e, #bb17e4, #ff9a44)'
              : '#fff',
            backgroundSize: editedTask.isChanged ? '300% 300%' : undefined,
            animation: editedTask.isChanged ? 'gradientAnimation 12s ease infinite' : undefined,
            color: editedTask.isChanged ? '#fff' : 'inherit',
            borderRadius: 1, // = theme.spacing(2) = 16px
            boxShadow: '0px 0px 2px rgba(145, 158, 171, 0.3), 0px 12px 24px -4px rgba(145, 158, 171, 0.12)',
            overflow: 'hidden',
            width: '100%',
            p: 1,
            position: 'relative',
            transition: 'background 0.3s ease',
          }} className={editedTask.isChanged ? 'gradient-background' : 'inherit'}>
            <Box px={2} py={1} display="flex" alignItems="center" justifyContent="space-between">
              <Typography fontWeight={600} variant="h5">
                {editedTask.nomer_zakaza}
              </Typography>
              <Box>
                <IconButton
                  aria-label="more"
                  aria-controls="long-menu"
                  aria-haspopup="true"
                  onClick={() => {}}
                >
                  <IconArrowsDiagonal size="1.25rem" />
                </IconButton>
                {/* <Menu
                  id="long-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem onClick={handleShowEditModal}>
                    <ListItemIcon>
                      <IconPencil size="1.2rem" />
                    </ListItemIcon>
                    <ListItemText> Edit</ListItemText>
                  </MenuItem>
                </Menu> */}
                {/* <EditTaskModal
                  show={showEditModal}
                  onHide={handleCloseEditModal}
                  task={task}
                  editedTask={editedTask}
                /> */}
              </Box>
            </Box>
            {/* <Box>
              {editedTask?.taskImage && (
                <img
                  src={editedTask?.taskImage}
                  alt="Task Image"
                  className="img-fluid"

                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              )}
            </Box> */}

            {/* {(ticket.__status?.status || 0) > 3 && <Typography variant="h6" fontWeight={600} noWrap>
              ФИО ПАССАЖИРОВ
            </Typography>}
            <Typography
              color="textSecondary"
              sx={{ maxWidth: '400px', display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden"}}
              variant="subtitle2"
              fontWeight={400}
            >
              {ticket.otvet_klientu1 ? `✈️${ticket.otvet_klientu1?.split('✈️')[1]}` : <React.Fragment><Typography fontWeight={600} noWrap>Запрос: </Typography>{ticket.zapros}</React.Fragment>} */}
            
              <Box px={2} py={1}>
                {(editedTask.__status?.status || 0) > 3 && editedTask.otvet_klientu && (
                  <>
                    {editedTask?.fio2?.map((currentId) => (
                      <Typography
                        key={uniqueId()}
                        variant="h6"
                        fontWeight={600}
                        sx={{
                          width: isMobile ? '100%' : '100%',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {passports[currentId]?.[0]} - {passports[currentId]?.[1]}
                      </Typography>
                    ))}
                  </>
                )}
                <Typography
                  color="textSecondary"
                  sx={{
                    maxWidth: '400px',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    overflow: 'hidden',
                  }}
                  variant="subtitle2"
                  fontWeight={400}
                >
                  {(info?.length ?? 0) > 53 ? `${info?.slice(0, 53)}...` : info}
                </Typography>
              </Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1}>
              <Stack direction="row" gap={1}>
                <IconCalendar size="1rem" />
                <Typography variant="body2">  {formatToRussianDate(editedTask.__updatedAt ?? editedTask.__createdAt, 'dd MMMM')}</Typography>
              </Stack>
              <Box>
                <Chip
                  size="small"
                  label={'Покупка'}
                  sx={{
                    backgroundColor,
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 400,
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
    </React.Fragment>
  );
};
export default TaskData;
