# Validation record

Executed October 31, 2026 on Node 26.10, Windows. CI uses Node 24 on Linux.

| Check | Result |
|---|---|
| Automated domain/API/service/persistence suite | 128 tests passed; no failures or skipped tests |
| Deterministic matching regression | 12/12 passed; explicitly not model accuracy |
| Production browser/Worker bundle | Build passed; valid ESM exporting `default.fetch` |
| Drizzle schema generator | Passed; no pending schema change |
| Clean dependency installation | Completed; registry audit reported zero vulnerabilities |
| Browser partial-remedy flow | Verified $59 simulated refund against $77 mixed purchase; cable remains outside remedy |
| Browser old capture | Confirmed source; 201-day payment routed to manual handling with disabled approval |
| Browser uncertain response | Verified source, approved, simulated lost response, observed UNKNOWN, reconciled to original completed refund |
| Real PayPal proof verifier | Correctly refused to produce evidence because sandbox credentials are absent |
| Real Gemini evaluation | Not run: no Gemini API key present |

The development dependency override updates the deprecated Drizzle loader's transitive esbuild to the same patched version used by the app. The database generator was exercised after that override. No esbuild development server is exposed.

The automated suite includes negative PayPal responses, 180-day boundaries, prior and partial refunds, stale evidence/campaign approvals, concurrent execution, SQLite persistence, unknown-response recovery through provider reads, external refund attribution, verified dispute holds, inbox retry, forged webhook rejection, origin checks and model schema failures. Provider transports in those tests are controlled doubles.

Live-provider proof and a recorded video must still be added before claiming a complete hackathon submission. See [readiness](READINESS.md).
