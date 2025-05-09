// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useState } from 'react';
import Menuitems from './MenuItems';
import { useLocation, useSearchParams } from 'react-router';
import { Box, List, useMediaQuery } from '@mui/material';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';

import { CustomizerContext } from 'src/context/CustomizerContext';
import { uniqueId } from 'lodash';
import { IconPlus } from '@tabler/icons-react';
import ModalTicket from 'src/components/apps/tickets/modal-ticket/modal-ticket';

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const { isSidebarHover, isCollapse, isMobileSidebar, setIsMobileSidebar } = useContext(CustomizerContext);
  const [open, setIsOpen] = useState(false);
  const [searchParams] = useSearchParams();

  console.log(open);

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu: any = lgUp ? isCollapse == "mini-sidebar" && !isSidebarHover : '';

  const href = searchParams.get('type') ? '/apps/tickets?type=kanban&add=new' : '/apps/tickets?add=new';

  const addItem =  {
    id: uniqueId(),
    title: 'Добавить новый заказ',
    icon: IconPlus,
    href,
  };
  
  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {Menuitems.map((item) => {
          // {/********SubHeader**********/}
          if (item.subheader) {
            return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;

            // {/********If Sub Menu**********/}
            /* eslint no-else-return: "off" */
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)}

              />
            );

            // {/********If Sub No Menu**********/}
          } else {
            return (
              <NavItem item={item} key={item.id} pathDirect={pathDirect} hideMenu={hideMenu}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)} />
            );
          }
        })}
          <NavItem item={addItem} key={addItem.id} pathDirect={'/er'} hideMenu={hideMenu}
            onClick={() => setIsMobileSidebar(!isMobileSidebar)} />
      </List>
    </Box>
  );
};
export default SidebarItems;
