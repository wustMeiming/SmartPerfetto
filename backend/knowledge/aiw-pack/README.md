# Android Internals Knowledge Pack assets

This directory contains SmartPerfetto's trusted TUF root, a version lock, and
the compressed public Knowledge Pack snapshot used for offline installs.

The content is built from eligible, finalized Android Internals Wiki articles.
It is licensed under `CC-BY-NC-SA-4.0 OR LicenseRef-AIW-Commercial`; possession
of the Pack does not itself grant a commercial license. See the license files
inside each bundled version.

Do not edit generated Pack files manually. Update the lock and assets with:

```bash
npm run knowledge-pack:fetch
```
