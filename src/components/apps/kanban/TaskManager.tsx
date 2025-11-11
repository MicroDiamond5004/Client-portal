
import { createRef, RefObject, useContext, useEffect, useState } from 'react';
import KanbanHeader from './KanbanHeader';
import { KanbanDataContext } from 'src/context/kanbancontext/index';
import CategoryTaskList from './CategoryTaskList';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import SimpleBar from 'simplebar-react';
import { Box, IconButton } from '@mui/material';
import ModalTicket from '../tickets/modal-ticket/modal-ticket';
import { useSearchParams } from 'react-router';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { ChatProvider } from 'src/context/ChatContext';
import getBiggestTicketNumber from '../tickets/get-big-ticket/get-big-ticket';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { updateTicket } from 'src/store/slices/ticketsSlice';
import { selectTodoCategories } from 'src/store/selectors/ticketsSelectors.ts';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

type TaskManagerProps = {
  changeView: (isList: boolean) => void,
}

function TaskManager(props: TaskManagerProps) {
  const {changeView} = props;
  const todoCategories = useAppSelector(selectTodoCategories) ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const [openTicket, setOpenTicket] = useState<ELMATicket>();
  const [showModal, setShowModal] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const dispatch = useAppDispatch();

  useEffect(() => {
    const item = searchParams.get('item');
    if (item) {
      const ticket = todoCategories.map((category) => category.child.find((ticket: ELMATicket) => ticket.nomer_zakaza === item)).filter((el) => el)[0];
      console.log(ticket, item);
      if (ticket) {
        setOpenTicket(ticket);
        setShowModal(true);
        dispatch(updateTicket({...ticket, isChanged: false}))
      }
    }
    if (todoCategories[0]?.child[0] && searchParams.get('add') && searchParams.get('add') === 'new') {
      // Получить самый большой номер заказа
      setOpenTicket({
        ...todoCategories[0]?.child[0],
        '__id': null,
        zapros: null,
        nomer_zakaza: String(Number(getBiggestTicketNumber(todoCategories)) + 1),
      });
      setShowModal(true);
    }
  }, [searchParams, todoCategories]);
  
  //Shows the modal for adding a new task.
  const handleShowModal = (id: string) => {
    console.log(`Открыл - ${id}`);
    if (id) {
      const type = searchParams.get('type');
      if (type) {
        setSearchParams({type, item: id});
      }
    }
  };
  
  const handleCloseModal = (): any => {
    setShowModal(false);
    const type = searchParams.get('type');
    if (type) {
      setSearchParams({type});
    }
  };
  
  const onDragEnd = (result: { source: any; destination: any; draggableId: any }) => {
    const { source, destination, draggableId } = result;

    // If no destination is provided or the drop is in the same place, do nothing
    if (
      !destination ||
      (source.droppableId === destination.droppableId && source.index === destination.index)
    ) {
      return;
    }

    // Extract necessary information from the result
    const sourceCategoryId = source.droppableId;
    const destinationCategoryId = destination.droppableId;
    const sourceIndex = source.index;
    const destinationIndex = destination.index;

    // Call moveTask function from context
    // moveTask(draggableId, sourceCategoryId, destinationCategoryId, sourceIndex, destinationIndex);
  };

  const scrollRef = useState<RefObject<HTMLDivElement>>(() => createRef())[0];

  const scrollContainer = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300; // px
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };


  return (
    <>
      <KanbanHeader
        addTask={(isCurrentNew) => {
          setIsNew(isCurrentNew);
          setSearchParams({ type: 'kanban', add: 'new' });
        }}
        changeView={(isList) => changeView(isList)}
      />

      <SimpleBar>
        <Box position="relative">
          {/* Arrow Buttons on top */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
              position: 'sticky',
              top: 0,
              backgroundColor: '#fff',
              zIndex: 20,
              px: 1,
            }}
          >
            <IconButton
              onClick={() => scrollContainer('left')}
              sx={{
                display: { xs: 'none', md: 'flex' },
                backgroundColor: '#f5f5f5',
                boxShadow: 1,
              }}
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>

            <IconButton
              onClick={() => scrollContainer('right')}
              sx={{
                display: { xs: 'none', md: 'flex' },
                backgroundColor: '#f5f5f5',
                boxShadow: 1,
              }}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Scrollable Categories */}
          <Box
            ref={scrollRef}
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              pb: 2,
              mt: 3
            }}
          >
            {openTicket && <ModalTicket show={showModal} ticket={openTicket as any} close={handleCloseModal}/>}
            {todoCategories.map((category) => (
              <Box key={category.id}>
                <CategoryTaskList id={category.id} openTicketModal={handleShowModal} />
              </Box>
            ))}
          </Box>
        </Box>
      </SimpleBar>
    </>
  );
}

export default TaskManager;
