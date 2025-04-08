
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
  Typography,
} from '@mui/material';
import BlankCard from '../../shared/BlankCard';
import dayjs from 'dayjs';
import ModalTicket from '../tickets/modal-ticket/modal-ticket';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { useSearchParams } from 'react-router';

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
        editedTask.isChanged = false;
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
          <BlankCard className={editedTask.isChanged ? 'gradient-background' : 'inherit'}>
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
              {(editedTask.__status?.status || 0) > 3 && <><Typography fontWeight={600} noWrap>
                  ФИО ПАССАЖИРОВ
                </Typography><br/></>}
                  {editedTask.otvet_klientu1 ? `✈️${editedTask.otvet_klientu1?.split('✈️')[1]}` : <React.Fragment><Typography fontWeight={600} noWrap>Запрос: </Typography>{editedTask.zapros}</React.Fragment>}
              </Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1}>
              <Stack direction="row" gap={1}>
                <IconCalendar size="1rem" />
                <Typography variant="body2">  {taskDate}</Typography>
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
          </BlankCard>
        </Box>
      ))}
    </Box>
    </React.Fragment>
  );
};
export default TaskData;
