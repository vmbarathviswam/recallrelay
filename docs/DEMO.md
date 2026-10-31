# Demo video script — 2 minutes 45 seconds

Record the actual running UI, 1080p if possible. Narration below is approximately 300 words. Pause on the visible amount and provider identifier, not on code. Do not expose `.env`, admin tokens, buyer credentials or API keys. Upload the final video publicly to YouTube and add its URL to the submission.

**Critical recording condition:** record scenario 1 against the real PayPal sandbox with real Gemini extraction after credentials are configured. If not completed, explicitly identify it as replay and do not claim live integration proof. The remaining synthetic edge cases are deliberately labelled replay. Cut between modes with an on-screen caption.

Use the full Node/server application for scenario 1. The public GitHub Pages replay deliberately has no live provider access; it is suitable for the labelled edge-case demonstrations.

| Time | Scenario and screen action | Narration |
|---|---|---|
| 0:00–0:12 | Overview, notice and response queue. | “A recall notice is only the beginning. A small merchant still needs to find affected purchases, check evidence, and return the right amount. RecallRelay brings that work into one response desk.” |
| 0:12–0:58 | **1. Purchase → evidence → partial refund.** Show real sandbox approval/capture for $77 mixed order. Upload the matching sample PNG; run live extraction. Merchant confirms the source, approves $59, then issues it. Show completed refund ID and retained $18 cable. | “This is a real PayPal sandbox purchase: a fifty-nine-dollar charger and an eighteen-dollar cable. Gemini reads the label. Code matches the model and serial to the merchant-approved campaign and the original purchase. I verify the evidence and approve the remedy. Only then does PayPal refund fifty-nine dollars. The cable remains paid.” |
| 0:58–1:20 | **2. Ambiguous label → clarification.** Switch to labelled replay. Open Alex, show missing serial, disabled approval; replace with clear sample. | “When a serial is unreadable, the case asks for a clearer label. There is no guessed identity and no refund authorization. New evidence needs a fresh human verification.” |
| 1:20–1:39 | **3. Old capture → manual remedy.** Open Sam, confirm evidence and show 201-day restriction. | “A matching product is not enough. This payment is outside PayPal's refund window, so it moves to manual handling. The merchant can arrange the appropriate remedy without pretending the API can do it.” |
| 1:39–1:55 | **4. Duplicate claim → blocked.** Demo scenarios, duplicate button, visible conflict. | “Opening the same purchase item twice is refused. Previous attributed refunds also reduce the remaining item amount.” |
| 1:55–2:20 | **5. Lost response → reconcile.** Jordan: verify, approve, lost-response button. Show UNKNOWN, then reconcile and one existing refund. | “What if PayPal processed a refund but its response disappeared? The operation stays reserved and uncertain. Reconciliation finds the original refund by operation identity. It does not send another payment.” |
| 2:20–2:35 | **6. Forged webhook → rejected.** Send forged event, show 403. Briefly show audit journal. | “An unsigned webhook cannot change payment records. Verified notifications are deduplicated and reconciled against PayPal, with identifiers in the journal.” |
| 2:35–2:45 | Completed overview, source and demo URLs. | “AI reads the evidence. The merchant authorizes the remedy. PayPal provides the payment result. RecallRelay is open source and runnable, with documented safeguards and over fifty automated tests.” |

## Recording preparation

1. Use a clean replay session and one real sandbox mixed purchase. Pre-open the PayPal approval tab to avoid spending the video on login. Editing may shorten waiting, but never fabricate an outcome.
2. Capture the actual sandbox purchase/refund evidence with `npm run verify:sandbox`; check the hosted mode label and Gemini result label before recording.
3. Use only the fictional product images in `samples/`. The first new purchase serial is `N65-2408-8000`; later purchases get distinct serials, so supply a matching label rather than reusing a wrong image.
4. Keep a title card “Replay edge-case scenarios — simulated provider responses” visible after the cut at 0:58.
5. The demo must remain coherent if a provider is unavailable. Use a separately labelled replay, and state that live verification is pending rather than obscuring the failure.
6. Add captions, public repository URL, MIT license, hosted URL and the exact tested setup to the Devpost description. Final length must stay under three minutes.
