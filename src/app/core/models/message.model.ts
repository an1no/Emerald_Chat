export interface Message {
    id: string;
    content: string;
    sender: string;
    avatar: string;
    timestamp: string;
    isOwn: boolean;
    status?: 'sent' | 'delivered' | 'read';
    profile?: {
        username: string;
        avatar_url: string;
    };
}

export interface Profile {
    id: string;
    username: string;
    avatar_url: string;
}

export interface Room {
    id: string;
    name: string;
    unread?: number;
    is_dm?: boolean;
}


export interface DirectMessage {
    id: string;
    name: string;
    avatar: string;
    online: boolean;
    unread?: number;
    userId?: string; // ID of the other user
}
