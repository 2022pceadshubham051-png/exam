import { useState } from "react"; import { Bookmark, BookmarkCheck } from "lucide-react"; import { addNote, isSaved, qKey, removeNote } from "../lib/notebook";
/** Bookmark button for the exam screen. The correct answer is unknown mid-exam, so it is filled in when the student opens Review. */
export default function SaveQ({ text, options, topic, testName }: { text: string; options: { key: string; text: string }[]; topic?: string | null; testName: string }) {
  const [on, setOn] = useState(() => isSaved(text));
  const toggle = () => { if (on) removeNote(qKey(text)); else addNote({ text, options, correctKey: null, topic, testName, kind: "saved" }); setOn(!on); };
  return <button type="button" className="btn btn-sm" aria-pressed={on} onClick={toggle} title="Save this question to your notebook">{on ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}{on ? "Saved" : "Save"}</button>;
}
