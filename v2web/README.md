# Gravweb V2WEB

V2WEB is a parallel architecture workspace. It does not replace the current
V1 flow yet.

Current V1 remains the functional reference:

- Auth0/local session
- `/analisis` terrain selection
- `/particles` terrain viewer
- project save/recovery
- Rhino Compute legacy `beta3.gh` flow
- demo terrain fallback

V2WEB starts with contracts and registries so future modules can be plugged in
without coupling tools, Rhino definitions, backend jobs, scene interactions, and
generative representations.

## First Milestone

V2WEB-0 defines:

- Core project, artifact, scene, feature, job, tool, representation, and Rhino
  app contracts.
- Formal orchestrator and subagent contracts.
- Builtin orchestrator agent registry and starter terrain workflow plan.
- Frontend tool registry shape.
- Representation registry shape.
- Rhino app registry shape.
- Backend job-first and orchestrator skeleton.
- Architecture and agent plan documentation.

No production code is wired to these files yet.

## Directory Map

```txt
v2web/
  apps/
    web/
  packages/
    core/
    orchestrator/
    tools/
    representations/
    rhino/
  server/
    local-backend/
  docs/
```

## Design Rule

Every new capability must be a module with:

- a manifest
- strict input/output contracts
- explicit permissions and side effects
- a renderer or adapter
- a job path if it is heavy
- a clear owner runtime: frontend, backend, Rhino Compute, or generative
