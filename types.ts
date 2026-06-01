export interface TeacherProfile {
  id?: string;
  name: string;
  gradeClass: string;
  experience: string;
  region: string;
  language: string;
  email: string;
  phone: string;
  address: string;
  fontSize?: "small" | "medium" | "large";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: string;
  topic?: string;
  isLong?: boolean;
}

export interface WellBeingTopic {
  id: string;
  title: string;
  emoji: string;
  englishTitle: string;
  description: string;
  insight: string;
  teacherHack: string;
  sources: string[];
  powerKeywords: string[];
}

export interface AdminRecord {
  teachers: TeacherProfile[];
  analytics: {
    id: string;
    eventType: string;
    teacherId: string;
    metadata: any;
    timestamp: string;
  }[];
  chats: {
    id: string;
    teacherId: string;
    teacherName: string;
    userMessage: string;
    agentResponse: string;
    topic: string;
    timestamp: string;
  }[];
  sessions?: {
    sessionId: string;
    teacherId: string;
    teacherName: string;
    messages: ChatMessage[];
    currentTopic: string;
    language: string;
    startTime: string;
    updatedAt: string;
    timeTakenSeconds: number;
  }[];
}
