# V2WEB Architecture

## Goal

Build a modular Gravweb runtime that can support:

- realtime terrain interaction
- backend jobs and artifact storage
- multiple Grasshopper applications
- frontend tools
- backend tools
- generative representation modules

The current V1 app remains the source of functional truth while V2WEB is built
in parallel.

## Runtime Layers

```txt
Frontend shell
  Auth, routes, project state, tool host, representation host.

Scene runtime
  Terrain mesh, features, layers, picking, raycasts, object transforms.

Backend local
  Projects, jobs, artifacts, analysis, orchestration.

Rhino Compute adapter
  Versioned Grasshopper definitions, /io cache, /grasshopper solve.

Generative module runtime
  LLM-created reports, charts, tooltips, dashboards, and safe tools.
```

## Module Types

### Tool Module

Operates on terrain or project state.

Examples:

- polygon editor
- point marker
- object mover
- drainage analysis
- terrain base processing

### Representation Module

Communicates project information to the user.

Examples:

- chart
- tooltip
- markdown report
- dashboard
- 3D annotation

### Rhino App Module

Wraps a Grasshopper definition.

Examples:

- `rhino.terrain-base.beta3`
- future hydrology design
- future reservoir design

## Non-Negotiable Rules

1. Do not put heavy arrays in global UI state.
2. Do not call Rhino Compute directly from UI in V2WEB.
3. Every heavy operation creates a job.
4. Every output is an artifact with metadata.
5. Every module declares inputs, outputs, permissions, and side effects.
6. Generative modules return manifests or view specs, not arbitrary app changes.

## Migration Boundary

Keep these V1 assets as compatibility references:

- `src/components/rhinoCompute/io_req.json`
- `src/services/grasshopperProjectAdapter.ts`
- `src/services/rhinoComputeService.ts`
- `public/demo/*.json.gz`
- `src/components/waterParticles/WaterParticle.tsx`
- `src/components/maps/MapaPoligono.tsx`

Extract behavior from them gradually. Do not rewrite them in place.

