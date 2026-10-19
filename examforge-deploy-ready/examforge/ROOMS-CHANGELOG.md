# Live rooms

- Rooms are real-time for every member: join/leave, online dots, Ready state and chat update about every 2 s (the API is serverless on Vercel, so this uses short polling instead of WebSockets).
- Lobby: each non-host player presses **I'm ready**. The host can press **Start test for everyone** only when 2+ players are in and all are ready. A 5 s countdown (server clock) then opens the exam for everyone at the same moment, in Exam mode.
- Only tests that nobody in the room has attempted can be used (checked on create, join, change-test and start). The host can change the test in the lobby; Ready resets.
- Chat is open in the lobby and stays open during/after the round.
- After the test the room shows live standings; the host can start a new round with a fresh test.
- The Learn tab is gone (`/learn` redirects to Rooms). The tab bar now has Lecture Pace and Rooms in its place.
- Run `npx prisma db push` in `backend/` after deploying.
