# Recorded hook payloads

These JSON files are the STDIN payloads that Kiro CLI 3.3.0 (V3 engine) sent to hook commands in the headless hook experiment on 16 Nov 2026 (experiments E2 and E4 in `docs/experiments.md`). Each file is the first payload of its kind from that run.

Changes from the recording: the lab folder's absolute path is replaced with `/path/to/workspace`, and the JSON is pretty-printed. Nothing else is changed. The session id is the real one from that run; it identified a throwaway session in a scratch folder.

`tests/hooks/recorded-payloads.test.ts` feeds them to the helpers and the hook scripts.
