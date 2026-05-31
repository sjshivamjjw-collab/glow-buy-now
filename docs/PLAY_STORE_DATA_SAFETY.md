# Ripple — Google Play Data Safety & Permissions Cheat-Sheet

Single source of truth for the Play Console **Data Safety form**, **Permissions declarations**, **Content rating**, and **Target audience** sections.

Keep this in lockstep with `src/pages/PrivacyPage.tsx` — Google rejects apps when the Data Safety answers don't match the Privacy Policy.

---

## App-level answers

| Field | Answer |
|---|---|
| App category | Social |
| Target age group | **18+** (Not Designed for Families) |
| Contains ads | **No** |
| In-app purchases | No (initial release) |
| Government app | No |
| News app | No |
| COVID-19 contact tracing | No |
| Data encrypted in transit | **Yes** (HTTPS / TLS everywhere) |
| Users can request data deletion | **Yes — in-app + public URL** (`https://myripple.co.in/delete-account`) |
| Complies with Play Families Policy | N/A — not for children |
| Independent security review | No |

---

## Data Safety form — data we collect

For every row: **Collected = Yes**, **Shared with third parties = No** (processors don't count as "sharing" under Play's definition), **Optional/Required** per column, **Encrypted in transit = Yes**, **User can request deletion = Yes**.

### Personal info
| Data type | Collected | Optional? | Purpose |
|---|---|---|---|
| Name | Yes | Required | App functionality |
| Phone number | Yes | Required | App functionality (account auth via OTP) |
| User IDs | Yes | Required | App functionality |
| Other info — DOB, gender, city | Yes | **Optional** | Account management, personalisation |

### Photos and videos
| Photos | Yes | Optional | App functionality (posts, avatar) |
| Videos | Yes | Optional | App functionality (posts, livestreams) |

### Messages
| In-app messages (community chat, live chat) | Yes | Optional | App functionality |

### Audio
| Voice / sound recordings | Yes | Optional | App functionality (video posts, livestreams) |

### App activity
| App interactions | Yes | Required | Analytics, Personalisation |
| In-app search history | Yes | Optional | App functionality |
| Other user-generated content (posts, comments, likes) | Yes | Optional | App functionality |

### App info & performance
| Diagnostics / crash logs | Yes | Required | Analytics, App functionality |
| Other app performance data | Yes | Required | App functionality |

### Device or other IDs
| Device or other IDs | Yes | Required | App functionality, Fraud prevention/security |

### Data we **do not** collect
- Approximate or precise location
- Financial info / payment info
- Health & fitness data
- Contacts / SMS / call logs
- Web browsing history
- Files & docs outside the photo library
- Calendar
- Race & ethnicity, religious beliefs, sexual orientation, political views (any "sensitive info")

---

## Permissions declarations (AndroidManifest.xml + Play Console)

| Permission | Used for | User-visible rationale string |
|---|---|---|
| `INTERNET` | Core networking | (auto-granted, no rationale needed) |
| `CAMERA` | Record posts and go live | "Ripple uses your camera to record posts and go live." |
| `RECORD_AUDIO` | Capture audio for video posts and livestreams | "Ripple uses your microphone for live broadcasts and video posts." |
| `READ_MEDIA_IMAGES` (Android 13+) | Pick existing photos to upload | "Ripple needs access to your photos to upload posts and profile pictures." |
| `READ_MEDIA_VIDEO` (Android 13+) | Pick existing videos to upload | "Ripple needs access to your videos to upload posts." |
| `READ_EXTERNAL_STORAGE` (Android 12 and below, `maxSdkVersion=32`) | Pick existing photos/videos | Same as above |
| `POST_NOTIFICATIONS` (Android 13+) | Push notifications for replies, follows, livestreams | "Ripple sends you notifications about replies, follows, and livestreams you may like." |
| `WAKE_LOCK` | Keep livestream alive while broadcasting | (no rationale needed) |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PROJECTION` | Livestream foreground service | (Play asks for "Foreground services" declaration → choose **Media playback / broadcasting**) |

We do **not** request: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `READ_CONTACTS`, `READ_SMS`, `READ_CALL_LOG`, `BLUETOOTH_*`, `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`, `SYSTEM_ALERT_WINDOW`. If you ever add any of these, Play will require a sensitive-permission declaration and may demand a video walkthrough.

---

## Content rating questionnaire (IARC)

Answer the IARC questionnaire as follows. Resulting rating: **Mature 17+**.

| Question | Answer |
|---|---|
| Violence — cartoon / fantasy | None |
| Violence — realistic | None |
| Sexual content / nudity | None |
| Profanity / crude humor | Mild / infrequent (user-generated) |
| Mature / suggestive themes | Mild / infrequent |
| Horror or fear themes | None |
| Simulated gambling | None |
| Real gambling | None |
| Drug, alcohol, tobacco references | Mild / infrequent |
| **User-generated content** | **Yes** |
| **User-to-user interaction** (chat, follow) | **Yes** |
| **Shares user location** | No |
| **Shares personal info** | No (we don't share between users by default) |
| **Unrestricted internet access** | No (we sandbox in-app browsing) |
| Digital purchases | No |

### Required UGC controls (already implemented — verify before submission)
- [ ] Report button on every post, comment, profile, and livestream
- [ ] Block button on every profile
- [ ] Account deletion in-app and at `/delete-account`
- [ ] Moderation contact published in Privacy Policy (Grievance Officer block)
- [ ] Reported content actioned within 24 hours

---

## Target audience & content

- **Target age range:** 18 and older
- **Appeals to children:** No
- **Ads shown to children:** N/A
- **Store listing certification:** Confirm the app does not unintentionally appeal to children (no cartoon characters, no kids-themed imagery in store assets).

---

## Things to double-check the day of submission

1. Privacy Policy URL `https://myripple.co.in/privacy` loads in an incognito browser.
2. Account Deletion URL `https://myripple.co.in/delete-account` loads in an incognito browser.
3. Permission rationale strings in `AndroidManifest.xml` / `strings.xml` match the table above word-for-word.
4. Every "Yes" in the Data Safety form is mentioned in the Privacy Policy under the same name.
5. No analytics / advertising SDK is bundled in the release build (`apk-analyzer dex packages` to confirm).
