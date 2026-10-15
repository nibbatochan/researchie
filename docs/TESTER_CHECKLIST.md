# Tester test checklist

Run this on the deployed site with two real browser profiles (A and B) and two throwaway email addresses.
"Pass" means exactly what the right-hand column says. Items marked **auto** also have an automated test.

## Accounts
| # | Do | Pass when |
|---|---|---|
| 1 | Profile A: Create account (name, email, password of 8+ characters) | Lands in the app with a project called "My first project". No demo user ("Alex Chen") appears anywhere. |
| 2 | Sign up again with the same email | Message says the account exists. |
| 3 | Sign up with a 5-character password | Message asks for 8+ characters. **auto** |
| 4 | Sign out (profile menu) | Goes to the sign-in page. Pressing Back does not show your data. Reload still shows sign-in. |
| 5 | Sign in with a wrong password, then a wrong email | Both show "Email or password is incorrect." Nothing else. **auto** |
| 6 | Sign in with the right password | Back in the app; your project is still there. |
| 7 | Browser dev tools -> Application -> Local/Session Storage and Cookies | No profile, token or key in storage. The `sb-...` cookies are marked HttpOnly. **auto** (storage part) |
| 8 | "Continue with Google" | Button is disabled and says "coming soon". |
| 9 | Switch account (profile menu) | Ends the session and opens sign-in. Sign in as B: you see none of A's data. |

## Data isolation (A and B, signed in at the same time)
| # | Do | Pass when |
|---|---|---|
| 10 | A creates a project, a note and a link clip | B sees none of them (feed, search, documents, canvas). |
| 11 | B opens A's clip id in the address bar, e.g. `/api/atoms?projectId=<A's project id>` | Empty list, not A's clips. |
| 12 | B calls `DELETE /api/atoms?id=<A's atom id>` (dev tools console `fetch`) | 404; the clip is still in A's feed. |
| 13 | A uploads a PDF under 4 MB; B lists documents | B sees nothing of A's. |
| 14 | In Supabase SQL editor: `select user_id, count(*) from atoms group by 1;` | Each tester's id has only their own count. |
| 15 | A pins a card, changes citation style, resizes the PDF assistant, signs out and in | Settings and pin are still there (they live in the account). |

## AI key
| # | Do | Pass when |
|---|---|---|
| 16 | Ask a document question with no key saved | "Add your AI key in Settings..." with a link; no made-up answer. |
| 17 | Settings -> AI: paste a valid Groq key, Save and connect | "Connected to Groq." Panel shows the last 4 characters only. |
| 18 | Test connection | "Connected to Groq." and a new "checked" time. |
| 19 | Ask the document question | A grounded answer with citations. |
| 20 | Paste a made-up key | "Groq rejected this key." Not saved. |
| 21 | Save a valid key, then revoke it in the Groq console, then ask a question | "Your AI provider rejected your key." with a link. |
| 22 | Remove key, ask again | Same message as 16. |
| 23 | A saves her key, B saves a different one | Each uses their own (check in each provider's usage page). |
| 24 | Dev tools -> Network on the Settings page | No response contains the key; the page only ever gets `last4`. |
| 25 | Choose Google AI Studio in the dropdown | A red notice warns that free-tier content may be used by Google and read by people. |
| 26 | Burn through a free limit (e.g. OpenRouter free: 50 a day) | "Your AI provider's free limit is used up for now." with a wait time when the provider gives one. |

## Extension
| # | Do | Pass when |
|---|---|---|
| 27 | Settings -> Account -> Create token | Shown once; the list shows it as "never used". |
| 28 | Extension popup -> Connect with a wrong token | "The server did not accept that token." Nothing saved. |
| 29 | Connect with the right address and token | "Connected to <host>". The active project is one of A's. |
| 30 | Clip a quote, a block, an image, a screenshot | Each appears in A's feed, not B's. |
| 31 | Disconnect, then clip | Toast says "Not connected. Open the Researchie popup and use Connect." (not "Sent"). |
| 32 | Revoke the token in Settings, then clip | Same "Not connected" message; the clip waits in the queue and the popup Sync can retry it after reconnecting. |
| 33 | Summarize a page from the side panel with no key saved | The "Add your AI key" message, not a fake summary. |

## Not built (expect these to be missing)
Sharing and invites between accounts, delete account, account list for switching, Google sign-in, knowledge graph.
