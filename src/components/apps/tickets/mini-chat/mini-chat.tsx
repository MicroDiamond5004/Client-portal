import { Box } from "@mui/system";
import { ChatProvider } from "src/context/ChatContext";
import ChatContent from "../../chats/ChatContent";
import { Avatar, Divider, ListItemAvatar, Typography } from "@mui/material";
import ChatMsgSent from "../../chats/ChatMsgSent";
import { IconMenu2 } from "@tabler/icons-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ChatsType } from "src/types/apps/chat";
import SimpleBar from "simplebar-react";
import { useRef } from "react";

function MiniChat({selectedChat}: any) {
    const mainBoxRef = useRef<HTMLElement>(null);
    const inBoxRef = useRef<HTMLElement>(null);

    return (
    <Box flexGrow={1} border={'1px solid #e5eaef'}>
    <SimpleBar>
      <Box sx={{display: 'flex', flexWrap: 'wrap'}}>
        {selectedChat ? (
          <Box width={'100%'}> 
            {/* ------------------------------------------- */}
            {/* Chat Content */}
            {/* ------------------------------------------- */}

            <Box sx={{display: 'flex', width: 'auto', overflow: 'hidden'}} ref={mainBoxRef}>
              {/* ------------------------------------------- */}
              {/* Chat msges */}
              {/* ------------------------------------------- */}

              <Box>
                <Box
                  sx={{
                    height: "auto",
                    overflow: "auto",
                    maxHeight: "800px",
                    width: mainBoxRef && inBoxRef && ((mainBoxRef.current?.clientWidth || 0) - (inBoxRef.current?.clientWidth || 0)) > 300 ?
                     `${((mainBoxRef.current?.clientWidth || 0) - (inBoxRef.current?.clientWidth || 0))}px` : '300px',
                  }}
                >
                  <Box p={3}>
                    {selectedChat?.messages?.slice(selectedChat?.messages.length - 3, selectedChat?.messages.length).map((chat: any, index: number) => {
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
                                  >
                                    {chat.msg}
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
                                  >
                                    {chat.msg}
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
            </Box>
          </Box>
        ) : (<></>)}
      </Box>
    </SimpleBar>
      <Divider />
      <ChatMsgSent currentChat={selectedChat} />
    </Box>
    )
}

export default MiniChat;