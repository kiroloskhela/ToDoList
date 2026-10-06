import { defineConfig } from 'vitest/config';
export default defineConfig({test:{projects:[
  {test:{name:'unit',environment:'node',include:['apps/api/src/**/*.test.ts','packages/contracts/src/**/*.test.ts']}},
  {test:{name:'web',environment:'jsdom',include:['apps/web/src/**/*.test.{ts,tsx}'],setupFiles:['apps/web/src/test/setup.ts']}},
  {test:{name:'integration',environment:'node',include:['apps/api/test/**/*.test.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}},
],coverage:{provider:'v8',include:['packages/contracts/src/**/*.ts','apps/api/src/**/*.ts','apps/web/src/**/*.{ts,tsx}'],exclude:['**/*.test.*','**/test/**','apps/api/src/server.ts','apps/web/src/main.tsx'],thresholds:{lines:85,functions:85,branches:80,'apps/api/src/tasks/task-service.ts':{lines:95,functions:95,branches:90},'packages/contracts/src/index.ts':{lines:95,functions:95,branches:90}}}}});
