# Publish the verified judge build

The **Stage verified judge release** workflow verifies the original judge ZIP
from [the successful main run](https://github.com/himanshu748/wraith-kit/actions/runs/46168741325).
It checks the artifact's identity and SHA-256 digest, extracts the single
`wraith-kit-judge.zip` asset and checks that it opens. The workflow produces a
SHA-256 checksum for the inner ZIP used for judging.

1. Run the workflow on `main` with **Create an unpublished draft** enabled.
2. Review the `kiroween-2026-ci-73ab9be` draft under Releases. It should have
   the ZIP, its checksum, and a link to the browser test that exercised both
   extracted apps.
3. In the repository's Settings, enable **Release immutability** before
   publishing the draft. Publish the reviewed draft from Releases.

GitHub applies immutability when a new release is published. The draft uses a
new tag that points at the exact build commit. The existing
[`kiroween-2026-test` release](https://github.com/himanshu748/wraith-kit/releases/tag/kiroween-2026-test)
and its download links continue to work.
