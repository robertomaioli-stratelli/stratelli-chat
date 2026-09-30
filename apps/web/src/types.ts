export type Answer = {
  demo: boolean;
  city: string;
  cityId: string;
  kind: string;
  text: string;
  rows?: { label: string; value: number }[];
  title?: string;
  unit?: string;
  source?: string;
  period?: string;
  calculation?: string;
};
export type Exchange = {
  id: string;
  question: string;
  answer?: Answer;
  error?: string;
  feedback?: "yes" | "no" | null;
  feedbackComment?: string | null;
};
export type Conversation = { id: string; title: string; exchanges: Exchange[] };
export type Session = {
  demo: boolean;
  user: { id: string; name: string };
  city: { id: string; name: string };
};
