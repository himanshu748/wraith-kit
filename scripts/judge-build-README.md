# Wraith Kit judge test build

This local test build contains TODO Afterlife and Notice Ghoul. The fixtures
are fictional. Both apps run without installing dependencies or supplying
an account or API key.

Use Node.js 22.13 or newer. Unzip the archive, open its folder in a terminal,
and run these commands in separate terminals:

```sh
node wraith.mjs todo-afterlife
node wraith.mjs notice-ghoul
```

Both apps listen on loopback and can stay signed in in the same browser. Each
opens its own one-time sign-in link. If the browser does not open, open the
URL in the private file named by the terminal. Keep that link private.

For TODO Afterlife, approve a proposed rewrite and download the patch. For
Notice Ghoul, confirm a proposed date, then open the digest and download
the calendar. GitHub issue proposals use a local dry run in the default demo.

[Source and development instructions](https://github.com/himanshu748/wraith-kit)
