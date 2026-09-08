# Incoming WhatsApp alerts and shared navigation

Implemented locally on 8 September 2026. Use a staff account with both View WhatsApp inbox and View notifications permissions. Every active employee with those permissions receives their own saved notification for each new inbound text or voice note. Existing messages are not retroactively marked unread.

1. Stay on a client profile and send a message from a separate test phone to the connected WhatsApp account. Expect a popup, an Inbox message count, and a bell notification without refreshing. Socket events refresh immediately; polling recovers missed events approximately every 10 seconds while the browser is running.
2. Dismiss the popup. The Inbox and bell counts must remain. Refresh: the unread count persists, but old popups are not replayed.
3. Open the notification. It must open the correct account and conversation. Opening the visible conversation marks its loaded incoming messages read for this employee. Other employees retain their unread counts.
4. Keep that conversation visible and send another message. Expect the message in the conversation without an extra popup or sound. A background/minimized Inbox must not silently mark incoming messages read.
5. Receive a message from another conversation while viewing the first. Expect an alert and an unread badge for the other conversation.
6. In the notification bell, choose Message sound: Off — enable. Receive another message outside the active conversation and verify a short sound. Use the same toggle to mute. Sound preference is saved per employee in this browser; browsers may require a click/key press after reload before playing audio.
7. Sign in as another employee and verify independent read state. Removing Inbox access must hide message notifications and prevent opening/acknowledging them through protected APIs.
8. Visit Inbox, Clients, a client profile, Requests, Travellers, and Setup. Expect the same single-row green header, rounded active navigation, gold avatar, notification bell, and Setup menu. More exposes the remaining permitted sections. Page search appears on pages that supply a search action.

Automated verification: `npm run test:inbox-notifications --workspace apps/api` checks real database persistence, duplicate provider deliveries, eligible recipients and overrides, voice-note alerts, hidden message bodies, independent read state, arrival/read races, outbound exclusion, and mark-all-read. Its fixtures roll back.

Browser verification used a temporary local message fixture without sending a WhatsApp message externally: popup on client profile, saved bell entry, persistent unread count after refresh, conversation deep link, and matching header screenshots passed. Real-phone acceptance should repeat the steps above.
