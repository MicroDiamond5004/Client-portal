import React, { useContext, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Typography,
  Divider,
  Avatar,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Box,
  Stack,
  Badge,
  useMediaQuery,
  Theme
} from '@mui/material';
import { IconDotsVertical, IconMenu2, IconPhone, IconVideo } from '@tabler/icons-react';
import { formatDistanceToNowStrict } from 'date-fns';
import ChatInsideSidebar from './ChatInsideSidebar';
import { ChatContext } from "src/context/ChatContext";
import SimpleBar from 'simplebar-react';
import { ChatMessage, ChatsType } from 'src/types/apps/chat';



interface ChatContentProps {
  selectedChat: ChatsType | null;
}

const ChatContent: React.FC<ChatContentProps> = ({
  selectedChat
}: ChatContentProps) => {
  const [open, setOpen] = React.useState(true);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));

  const {selectedChat: chatFromContext} = useContext(ChatContext);

  const mainBoxRef = useRef<HTMLElement>(null);
  const inBoxRef = useRef<HTMLElement>(null);

  // console.log(selectedChat?.id, selectedChat?.messages[0], 'ffffffffffffffffffffffffffffffffffff');

  return selectedChat ? (
    <SimpleBar>
      <Box sx={{display: 'flex', flexWrap: 'wrap'}}>
        {selectedChat ? (
          <Box width={'100%'}> 
            {/* ------------------------------------------- */}
            {/* Header Part */}
            {/* ------------------------------------------- */}
            <Box>
              <Box display="flex" alignItems="center" p={2}>
                <Box
                  sx={{
                    display: { xs: "block", md: "block", lg: "block" },
                    mr: "10px",
                  }}
                >
                  {/* <IconMenu2 stroke={1.5} onClick={toggleChatSidebar} /> */}
                </Box>
                <ListItem key={selectedChat.name} dense disableGutters>
                  <ListItemAvatar>
                    <Badge
                      color={
                        selectedChat.status === "online"
                          ? "success"
                          : selectedChat.status === "busy"
                            ? "error"
                            : selectedChat.status === "away"
                              ? "warning"
                              : "secondary"
                      }
                      variant="dot"
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      overlap="circular"
                    >
                      <Avatar alt={selectedChat.name} src={selectedChat.thumb} sx={{ width: 40, height: 40 }} />
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="h5">{selectedChat.name}</Typography>
                    }
                    secondary={selectedChat.status}
                  />
                </ListItem>
                {/* <Stack direction={"row"}>
                  <IconButton aria-label="phone">
                    <IconPhone stroke={1.5} />
                  </IconButton>
                  <IconButton aria-label="video">
                    <IconVideo stroke={1.5} />
                  </IconButton>
                  <IconButton aria-label="sidebar" onClick={() => setOpen(!open)}>
                    <IconDotsVertical stroke={1.5} />
                  </IconButton>
                </Stack> */}
              </Box>
              <Divider />
            </Box>
            {/* ------------------------------------------- */}
            {/* Chat Content */}
            {/* ------------------------------------------- */}

            <Box sx={{display: 'flex', width: 'auto', overflow: 'auto'}} ref={mainBoxRef}>
              {/* ------------------------------------------- */}
              {/* Chat msges */}
              {/* ------------------------------------------- */}

              <Box>
                <Box
                  sx={{
                    height: "650px",
                    overflow: "auto",
                    maxHeight: "800px",
                    width: mainBoxRef && inBoxRef && ((mainBoxRef.current?.clientWidth || 0) - (inBoxRef.current?.clientWidth || 0)) > 300 ?
                     `${((mainBoxRef.current?.clientWidth || 0) - (inBoxRef.current?.clientWidth || 0))}px` : '300px',
                  }}
                >
                  <Box p={3}>
                    {selectedChat.messages?.length > 0 && selectedChat.messages.map((chat: any, index: number) => {
                      const safeHtml = DOMPurify.sanitize(chat.msg);
                      return (
                        <Box key={index + chat.createdAt}>
                          {selectedChat.id === chat.senderId ? (
                            <Box display="flex">
                              <ListItemAvatar>
                                <Avatar
                                  alt={selectedChat.name}
                                  src={selectedChat.thumb}
                                  sx={{ width: 40, height: 40 }}
                                />
                              </ListItemAvatar>
                              <Box>
                                {chat.createdAt ? (
                                  <Typography
                                    variant="body2"
                                    color="grey.400"
                                    mb={1}
                                  >
                                    {selectedChat.name},{" "}
                                    {formatDistanceToNowStrict(
                                      new Date(chat.createdAt),
                                      {
                                        addSuffix: false,
                                      }
                                    )}{" "}
                                    ago
                                  </Typography>
                                ) : null}
                                {chat.type === "text" ? (
                                  <Box
                                    mb={2}
                                    sx={{
                                      p: 1,
                                      backgroundColor: "grey.100",
                                      mr: "auto",
                                      maxWidth: "320px",
                                    }}
                                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                                  >
                                  </Box>
                                ) : null}
                                {chat.type === "image" ? (
                                  <Box
                                    mb={1}
                                    sx={{
                                      overflow: "hidden",
                                      lineHeight: "0px",
                                    }}
                                  >
                                    <img
                                      src={chat.msg}
                                      alt="attach"
                                      width="150" height="150"
                                    />
                                  </Box>
                                ) : null}
                              </Box>
                            </Box>
                          ) : (
                            <Box
                              mb={1}
                              display="flex"
                              alignItems="flex-end"
                              flexDirection="row-reverse"
                            >
                              <Box
                                alignItems="flex-end"
                                display="flex"
                                flexDirection={"column"}
                              >
                                {chat.createdAt ? (
                                  <Typography
                                    variant="body2"
                                    color="grey.400"
                                    mb={1}
                                  >
                                    {formatDistanceToNowStrict(
                                      new Date(chat.createdAt),
                                      {
                                        addSuffix: false,
                                      }
                                    )}{" "}
                                    ago
                                  </Typography>
                                ) : null}
                                {chat.type === "text" ? (
                                  <Box
                                    mb={1}
                                    sx={{
                                      p: 1,
                                      backgroundColor: "primary.light",
                                      ml: "auto",
                                      maxWidth: "320px",
                                    }}
                                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                                  >
                                  
                                  </Box>
                                ) : null}
                                {chat.type === "image" ? (
                                  <Box
                                    mb={1}
                                    sx={{ overflow: "hidden", lineHeight: "0px" }}
                                  >
                                    <img
                                      src={chat.msg}
                                      alt="attach"
                                      width="250" height="165"
                                    />
                                  </Box>
                                ) : null}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              {/* ------------------------------------------- */}
              {/* Chat right sidebar Content */}
              {/* ------------------------------------------- */}
              {open ? (
                <Box display="flex" flexShrink="0px" ref={inBoxRef}>
                  <ChatInsideSidebar
                    isInSidebar={lgUp ? open : open}
                    chat={selectedChat}
                  />
                </Box>
              ) : (
                ""
              )}
            </Box>
          </Box>
        ) : (
          <Box display="flex" alignItems="center" p={2} pb={1} pt={1}>
            {/* ------------------------------------------- */}
            {/* if No Chat Content */}
            {/* ------------------------------------------- */}
            <Box
              sx={{
                display: { xs: "flex", md: "flex", lg: "flex" },  
                mr: "10px",
              }}
            >
              <IconMenu2 stroke={1.5} />
            </Box>
            <Typography variant="h4">Select Chat</Typography>
          </Box>
        )}
      </Box>
    </SimpleBar>
  ): <></>;
};

export default React.memo(ChatContent);

