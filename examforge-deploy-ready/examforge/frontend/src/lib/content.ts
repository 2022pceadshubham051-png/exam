export const SITE = "ExamForge";
export const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || "your-email@example.com";

export type Tip = { slug: string; title: string; summary: string; body: string[] };
export const TIPS: Tip[] = [
  { slug: "negative-marking-strategy", title: "How to handle negative marking in mock tests", summary: "When to guess, when to skip, and how to protect your score.",
    body: [
      "Negative marking is the reason two students with the same knowledge can score very differently. If a wrong answer costs 0.25 marks, you need to be right more than one time in five just to break even on a guess. That is a low bar, so a guess is worth taking whenever you can remove even one option.",
      "A simple rule works well: if you can eliminate two options, answer. If you can eliminate none and the question looks long, skip it and come back at the end if time remains. Skipping costs nothing; a blind guess has a small negative expected value.",
      "Track this in your mock tests. After each attempt, check how many of your wrong answers were pure guesses and how many were careless mistakes. Guess-wrongs mean you should skip more. Careless-wrongs mean you should slow down on easy questions.",
      "Over a few mocks you will find your own break-even point. Use the result analysis after every test, not just the final score."] },
  { slug: "section-time-management", title: "Section-wise time management for timed exams", summary: "Split your time before the test starts, not during it.",
    body: [
      "Most timed exams have separate section timers, so the clock you fight is the section clock, not the whole paper. Decide your plan before you press start: how many minutes for the first pass, and how many for review.",
      "Do a first pass through the section answering only what you can solve quickly. Mark the rest for review. This guarantees you collect every easy mark before the clock runs out, instead of burning five minutes on one hard question.",
      "Set a per-question ceiling, for example 60 to 75 seconds in a reasoning section. If you cross it, mark the question and move on. Most questions you leave and return to take half the time on the second look.",
      "Practice this in full mock tests with the timer on. Untimed practice builds accuracy; timed mocks build pacing. You need both."] },
  { slug: "how-to-analyse-a-mock-test", title: "How to analyse a mock test so your next score improves", summary: "A 20 minute review routine that matters more than taking another test.",
    body: [
      "Taking test after test without analysis is the most common reason scores stop improving. The review is where the learning happens.",
      "Go through every wrong and skipped question and label the reason: did not know the concept, knew it but made a calculation or reading mistake, ran out of time, or guessed. Each reason needs a different fix.",
      "Look at topic-wise accuracy and group your weak topics. Practise those topics in untimed mode until accuracy is steady, then bring them back into timed tests.",
      "Compare each attempt with your previous one. You are looking for a trend in score, accuracy and time taken, not a single lucky result."] },
  { slug: "using-practice-mode-well", title: "Practice mode vs exam mode: when to use which", summary: "Use untimed practice to learn, timed mode to prove it.",
    body: [
      "Exam mode is for measuring where you stand under real conditions: strict timers, fixed rules, and a result that counts. Practice mode is for learning: no countdown, instant feedback and explanations.",
      "When a topic is new or weak, start in practice mode. Read every explanation, including for questions you got right, because a right answer reached by luck will not hold up in the exam.",
      "Once your accuracy on a topic is steady, switch to timed mock tests so speed catches up with accuracy. A common routine is practice on weak topics during the week and one full timed mock on the weekend.",
      "Adaptive practice, which picks questions from your weaker topics, is a good way to spend the time between full mocks."] },
];
