
import { useContext, useEffect, useState } from 'react';
import KanbanHeader from './KanbanHeader';
import { KanbanDataContext } from 'src/context/kanbancontext/index';
import CategoryTaskList from './CategoryTaskList';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import SimpleBar from 'simplebar-react';
import { Box } from '@mui/material';
import ModalTicket from '../tickets/modalTicket/modal-ticket';
import { useSearchParams } from 'react-router';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { ChatProvider } from 'src/context/ChatContext';

type TaskManagerProps = {
  changeView: (isList: boolean) => void,
}

function TaskManager(props: TaskManagerProps) {
  const {changeView} = props;
  const { todoCategories } = useContext(KanbanDataContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [openTicket, setOpenTicket] = useState<ELMATicket>();
  const [showModal, setShowModal] = useState(false);  

  useEffect(() => {
    const item = searchParams.get('item');
    if (item) {
      const ticket = todoCategories.map((category) => category.child.find((ticket: ELMATicket) => ticket.nomer_zakaza === item)).filter((el) => el)[0];
      console.log(ticket, item);
      if (ticket) {
        setOpenTicket(ticket);
        setShowModal(true);
        ticket.isChanged = false;
      }
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

  console.log(todoCategories);



  return (
    <>
      <KanbanHeader changeView={(isList) => changeView(isList)}/>
      <SimpleBar>
        <Box>
          <Box display="flex" gap={2}>
            {openTicket && <ModalTicket show={showModal} ticket={openTicket} close={handleCloseModal}/>}
            {todoCategories.map((category) => (
              <Box key={category.id}>
                  <div>
                    <CategoryTaskList id={category.id} openTicketModal={handleShowModal} />
                  </div>
              </Box>
            ))}
          </Box>
        </Box>
      </SimpleBar>
    </>
  );
}

export default TaskManager;
