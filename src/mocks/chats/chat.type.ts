export type ElmaComment = {
    __id: string,
    body: string | null,
    author?: string,
    createdAt: string,
    senderId: string,
}
export type ElmaMessage = {
    id: string,
    msg: string | null,
    createdAt: string,
    senderId: string,
    comments: ElmaComment[],
}

export type ElmaFile = {
    fileId: string,
    filename: string,
    url: string,
}

export type ElmaChat = {
    name: string,
    id: string,
    messages: ElmaMessage[],
    taskId: string,
    files: ElmaFile[],
    authors: Record<string, string>, 
    isChanged: boolean,
}