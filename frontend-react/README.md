# ScholarRAG — frontend

React 18 + TypeScript + Vite interface of ScholarRAG. See the main [README](../README.md) for the whole project.

```bash
npm install
VITE_API_URL=http://localhost:8100 npm run dev   # development (API on port 8100)
npm run build                                     # production build in build/
```

In Docker Compose the frontend is built by `Dockerfile.frontend` and served on http://localhost:3100.
