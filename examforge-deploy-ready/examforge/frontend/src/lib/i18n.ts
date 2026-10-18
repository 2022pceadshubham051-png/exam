import { useEffect, useState } from "react";
import { getLang, type Lang } from "./prefs";
// Strings for the app shell and the new Home / Learn / Notebook screens. Exam content is never translated here.
const hi: Record<string, string> = {
  "Home": "होम", "Practice": "प्रैक्टिस", "Coach": "कोच", "Learn": "सीखें", "Me": "मैं",
  "Good morning": "सुप्रभात", "Good afternoon": "नमस्कार", "Good evening": "शुभ संध्या",
  "days left": "दिन बाकी", "Set exam date": "परीक्षा की तारीख", "Exam day": "परीक्षा आज है", "day streak": "दिन की स्ट्रीक",
  "Today's plan": "आज का प्लान", "Continue where you left off": "जहाँ छोड़ा था वहीं से शुरू करें", "Continue": "जारी रखें", "Start test": "टेस्ट शुरू करें",
  "Take your first test": "पहला टेस्ट दें", "Your answers are saved.": "आपके जवाब सेव हैं।", "No tests yet": "अभी कोई टेस्ट नहीं",
  "Your journey": "आपका सफ़र", "Weak topics": "कमज़ोर टॉपिक", "Practice 10 min": "10 मिनट प्रैक्टिस", "Finish a test to see your weak topics.": "कमज़ोर टॉपिक देखने के लिए एक टेस्ट पूरा करें।",
  "This week": "इस हफ़्ते", "Mistake notebook": "गलती नोटबुक", "to revise today": "आज दोहराने के लिए", "Open": "खोलें", "Last result": "पिछला रिज़ल्ट", "Review mistakes": "गलतियाँ देखें",
  "Rankings": "रैंकिंग", "Top of the board": "बोर्ड में सबसे ऊपर", "Tests": "टेस्ट", "Progress": "प्रगति", "Shop": "शॉप", "Profile": "प्रोफ़ाइल",
  "Study material": "स्टडी मटेरियल", "Lecture Pace": "लेक्चर पेस", "Quick reads": "छोटे लेख", "Time your lectures and beat your own pace.": "लेक्चर का समय नापें और अपनी रफ़्तार सुधारें।",
  "Revise today": "आज दोहराएँ", "All mistakes": "सभी गलतियाँ", "Saved": "सेव किए", "Show answer": "जवाब देखें", "Got it": "समझ गया", "Still tough": "अभी मुश्किल है", "Nothing due. Come back tomorrow.": "आज कुछ बाकी नहीं। कल आइए।",
  "Rooms": "रूम", "Study rooms": "स्टडी रूम", "Pick one test, invite friends with a code, and see who scores best. Only Exam-mode attempts count.": "एक टेस्ट चुनें, दोस्तों को कोड भेजें और देखें कौन सबसे आगे है। सिर्फ़ एग्ज़ाम-मोड के अटेम्प्ट गिने जाते हैं।",
  "Join": "जुड़ें", "ROOM CODE": "रूम कोड", "Create a room": "रूम बनाएँ", "Create room": "रूम बनाएँ", "Choose a test…": "टेस्ट चुनें…", "Room name (optional)": "रूम का नाम (वैकल्पिक)", "No rooms yet": "अभी कोई रूम नहीं", "Create one, or enter a friend's code above.": "एक बनाएँ, या ऊपर दोस्त का कोड डालें।",
  "Take the test": "टेस्ट दें", "Invite friends": "दोस्तों को बुलाएँ", "Copy code": "कोड कॉपी करें", "Leave": "छोड़ें", "Rank": "रैंक", "Student": "छात्र", "Score": "स्कोर", "Accuracy": "सटीकता", "Time": "समय", "Not attempted yet": "अभी अटेम्प्ट नहीं किया", "(you)": "(आप)", "Standings use each student's best Exam-mode attempt on this test.": "स्टैंडिंग में हर छात्र का इस टेस्ट पर सबसे अच्छा एग्ज़ाम-मोड अटेम्प्ट गिना जाता है।", "member": "सदस्य", "members": "सदस्य",
  "Language": "भाषा", "Low-data mode": "लो-डेटा मोड", "Exam date": "परीक्षा की तारीख", "Share result": "रिज़ल्ट शेयर करें",
};
const dict: Record<Lang, Record<string, string>> = { en: {}, hi };
export const tr = (k: string, l: Lang = getLang()) => dict[l][k] ?? k;
/** Re-renders on language change and returns a translator. */
export function useT() {
  const [l, set] = useState<Lang>(getLang);
  useEffect(() => { const f = () => set(getLang()); window.addEventListener("ef-prefs", f); return () => window.removeEventListener("ef-prefs", f); }, []);
  return (k: string) => tr(k, l);
}
