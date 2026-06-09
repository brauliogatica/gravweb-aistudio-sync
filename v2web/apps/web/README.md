# V2WEB Web App

Placeholder for the future standalone frontend shell.

V2.2 exposes the first functional shell through the root AI Studio app route:

```txt
/v2web
```

This keeps AI Studio compatible with the existing root Vite app while the
standalone `v2web/apps/web` shell is prepared for a later extraction.

The future shell should mount:

- auth session provider
- project router
- terrain scene host
- tool panel host
- representation panel host
- job timeline
