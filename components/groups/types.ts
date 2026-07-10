export interface GroupModel {
  id: string;
  name: string;
  subject: string;
  description?: string; // Legacy
  privacy?: 'public' | 'private'; // Legacy
  visibility: 'public' | 'private';
  status: 'active' | 'inactive';
  isActive?: boolean; // Legacy
  category: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  members: string[];
  admins: string[];
  createdAt: any;
}

export interface GroupMessageModel {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
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
}
