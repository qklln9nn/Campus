export type CategoryType = 'Academic' | 'Club' | 'Sports' | 'Tech' | 'Cultural' | 'Career';

export type EventStatus =
  | 'OPEN'
  | 'FILLING_FAST'
  | 'WAITLIST'
  | 'CLOSED'
  | 'DRAFT'
  | 'PENDING'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: CategoryType;
  posterUrl: string;
  startTime: string; // e.g. 'Oct 24, 2026 • 14:00 PM'
  endTime: string;
  location: string;
  organiser: {
    name: string;
    avatar?: string;
  };
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
  status: EventStatus;
  isRegistered: boolean;
  isWaitlisted: boolean;
  isBookmarked: boolean;
}
