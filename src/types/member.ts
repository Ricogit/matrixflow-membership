export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  joinDate: string;
  position: {
    level: number;
    slot: number;
    parentId?: string;
  };
  leftChild?: Member;
  rightChild?: Member;
  sponsor?: string;
  status: 'active' | 'inactive' | 'pending';
  earnings?: number;
  personalMatrix?: {
    members: Member[];
  };
  stage: number; // Current stage level (1-7)
  directUplineId?: string; // Direct recruiter/sponsor ID for stage progression
}

export interface MatrixPosition {
  level: number;
  slot: number;
  member?: Member;
  isAvailable: boolean;
}

export interface MatrixStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  totalEarnings: number;
  matrixFull: boolean;
  availablePositions: number;
  currentMatrixMembers: number;
}