export type Role = "student" | "parent" | "teacher" | "admin";
export type Profile = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  code: string;
};
export type Classroom = {
  id: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
  joinCode: string;
  schedule: string;
};
export type Area = "number" | "fractions" | "algebra" | "geometry" | "data";
export type Question = {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
  hint: string;
};
export type VideoLesson = {
  id: string;
  title: string;
  fileName: string;
  mimeType: "video/mp4";
  size: number;
  storage: "local" | "supabase";
  storageKey: string;
  uploadedBy: string;
  uploadedAt: string;
};
export type Topic = {
  id: string;
  title: string;
  area: Area;
  objective: string;
  prerequisites: string[];
  minutes: number;
  lesson: string;
  example: string;
  practice?: Question;
  sectionId?: string;
  order?: number;
  videos?: VideoLesson[];
  checks: Question[];
  video?: { url: string; attribution: string; captioned: boolean };
};
export type TemplateQuestion = {
  id: string;
  label: string;
  max: number;
  topicId: string;
  rubric: string;
};
export type Template = {
  id: string;
  name: string;
  version: string;
  level: string;
  series: string;
  questions: TemplateQuestion[];
};
export type Mark = {
  questionId: string;
  status: "marked" | "unanswered" | "not_administered" | "unmarked";
  earned: number | null;
};
export type Assessment = {
  id: string;
  studentId: string;
  templateId: string;
  date: string;
  marks: Mark[];
  status: "draft" | "published";
  revision: number;
  updatedAt: string;
  authorId: string;
  correctionReason?: string;
};
export type Attempt = {
  id: string;
  studentId: string;
  topicId: string;
  answers: { questionId: string; choice: number; assisted: boolean }[];
  at: string;
};
export type Activity = {
  id: string;
  studentId: string;
  topicId: string;
  stage: "lesson" | "practice" | "check" | "complete";
  answers: Record<string, number>;
  questionIds: string[];
  attemptId: string;
  videoSeconds: number;
  videoPositions?: Record<string, number>;
  updatedAt: string;
};
export type Assignment = {
  id: string;
  studentId: string;
  classId?: string;
  className?: string;
  groupAssignmentId?: string;
  topicId: string;
  teacherId: string;
  reason: string;
  override: boolean;
  at: string;
  completedAt?: string;
};
export type Audit = {
  id: string;
  actorId: string;
  entityId: string;
  action: string;
  at: string;
  before: unknown;
  after: unknown;
  reason: string;
};
export type DeletionRequest = {
  id: string;
  studentId: string;
  at: string;
  status: "requested" | "completed";
};
export type ReportArea = {
  id: string;
  label: string;
  definition: string;
  topicIds: string[];
  scope: "area" | "topic";
  coverageConfirmed: boolean;
};
export type ReportTemplate = {
  id: string;
  familyId: string;
  name: string;
  version: number;
  scale: { min: number; max: number; step: number };
  areas: ReportArea[];
};
export type AreaResult = {
  areaId: string;
  correct: number | null;
  total: number | null;
};
export type TeacherReport = {
  id: string;
  studentId: string;
  templateId: string;
  date: string;
  grade: number;
  results: AreaResult[];
  status: "draft" | "published";
  revision: number;
  authorId: string;
  updatedAt: string;
  createdAt?: string;
  demo?: boolean;
};
export type ReportRead = {
  studentId: string;
  reportId: string;
  revision: number;
};
export type ParentLink = {
  parentId: string;
  studentId: string;
  verifiedAt: string;
};
export type TeacherContact = {
  teacherId: string;
  email: string;
  phone: string;
  hours: string;
};
export type State = {
  parentLinks?: ParentLink[];
  teacherContacts?: TeacherContact[];
  familyDemoVersion?: number;
  reportTemplates?: ReportTemplate[];
  reports?: TeacherReport[];
  reportReads?: ReportRead[];
  reportDemoVersion?: number;
  schemaVersion: 1;
  curriculumVersion?: number;
  profiles: Profile[];
  classes: Classroom[];
  topics: Topic[];
  templates: Template[];
  assessments: Assessment[];
  attempts: Attempt[];
  activities: Activity[];
  assignments: Assignment[];
  audit: Audit[];
  deletionRequests: DeletionRequest[];
};
export type Command =
  | { type: "enrollStudent"; classId: string; studentCode: string }
  | {
      type: "linkParent";
      parentCode: string;
      studentId: string;
      remove?: boolean;
    }
  | { type: "createGroup"; id: string; name: string; schedule: string }
  | { type: "updateGroupSchedule"; classId: string; schedule: string }
  | { type: "regenerateGroupCode"; classId: string }
  | { type: "saveTeacherContact"; contact: TeacherContact }
  | { type: "saveReportTemplate"; template: ReportTemplate }
  | {
      type: "saveReport";
      report: TeacherReport;
      expectedRevision: number;
      reason: string;
    }
  | { type: "readReport"; reportId: string; revision: number }
  | { type: "saveAssessment"; assessment: Assessment }
  | {
      type: "publishAssessment";
      id: string;
      expectedRevision: number;
      reason: string;
      marks?: Mark[];
    }
  | { type: "submitAttempt"; attempt: Attempt }
  | { type: "saveActivity"; activity: Activity }
  | {
      type: "saveVideoPosition";
      studentId: string;
      topicId: string;
      videoId: string;
      seconds: number;
    }
  | { type: "attachVideo"; topicId: string; video: VideoLesson }
  | { type: "assign"; assignment: Assignment }
  | {
      type: "assignGroup";
      id: string;
      classId: string;
      topicId: string;
      reason: string;
      override: boolean;
    }
  | { type: "saveTemplate"; template: Template }
  | { type: "saveTopic"; topic: Topic }
  | { type: "saveClass"; classroom: Classroom }
  | { type: "saveProfile"; profile: Profile }
  | { type: "requestDeletion"; id: string }
  | { type: "eraseStudent"; studentId: string };
export const areas: { id: Area; name: string; short: string; color: string }[] =
  [
    {
      id: "number",
      name: "Числа и вычисления",
      short: "Числа",
      color: "#547564",
    },
    {
      id: "fractions",
      name: "Дроби и отношения",
      short: "Дроби",
      color: "#9A653E",
    },
    {
      id: "algebra",
      name: "Алгебра и закономерности",
      short: "Алгебра",
      color: "#8276A7",
    },
    {
      id: "geometry",
      name: "Геометрия и измерения",
      short: "Геометрия",
      color: "#658C9B",
    },
    {
      id: "data",
      name: "Данные и вероятность",
      short: "Данные",
      color: "#AD8644",
    },
  ];
