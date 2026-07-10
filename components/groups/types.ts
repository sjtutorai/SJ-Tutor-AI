export interface GroupModel {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  visibility: 'public' | 'private';
  category: string;
  subject?: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  members: string[];
  admins: string[];
  isActive: boolean;
  status?: 'active' | 'inactive';
  createdAt: any;
}

export interface GroupMessageModel {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  mediaName?: string;
  readBy?: string[];
  clientMsgId?: string;
}

export interface GroupInviteModel {
  id: string;
  email: string;
  invitedBy: string;
  invitedByName: string;
  groupId: string;
  groupName: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  receiverUid?: string | null;
  createdAt: any;
  expiresAt?: any;
}

