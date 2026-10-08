import { handleModeration } from './handler.ts'

Deno.serve((req) => handleModeration(req))
