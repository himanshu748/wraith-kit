# Tasks: wraith-core

Codex-authored implementation after the author's 17 Nov build instruction. Checked items mean the code and focused tests exist; they do not establish Kiro IDE execution or deployed/provider behavior.

- [x] 1. Implement fixed contracts, app validation and pure ordered rules
  _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_
- [x] 2. Implement atomic record mutations, provenance and checked human decisions
  _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12, 13.13, 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 16.1, 16.2, 16.3, 16.4, 24.1, 24.2, 24.3, 24.4, 25.1, 25.2, 25.3, 25.4, 25.5_
- [x] 3. Implement delivery intake, polling, aggregation and explicit demo reset
  _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 20.1, 20.2, 20.3, 20.4, 20.5, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_
- [x] 4. Implement adapter gates, evidence verification and escaped HTML
  _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 23.1, 23.2, 23.3_
- [x] 5. Implement claim leases, timeout recovery, retry limits and keyed audit
  _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 22.10, 22.11_

## Integration follow-through

- [x] 6. Run the shared FileStore/DynamoStore contract against DynamoDB Local with actual SDK network calls, generated intake/order cases, forced CAS contention and lease recovery. All ten tests passed; this is local-service evidence, not AWS deployment.
  _Requirements: 25.1_
- [x] 6.1. Run complete app/browser journeys; record provider and deployment boundaries separately.
  _Requirements: 21.6, 25.1_
- [ ] 7. If automatic demo reset is enabled later, specify its interval and owner warning and exercise it. Currently only explicit reset exists, with audit preserved and executing/uncertain attempts protected.
  _Requirements: 21.5_
- [ ] 8. Record Kiro IDE property extraction when the author runs it; this implementation has no IDE Correctness evidence.
