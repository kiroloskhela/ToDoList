import { randomUUID } from 'node:crypto';
import { beforeAll,beforeEach,afterAll,describe,expect,it } from 'vitest';
import pg from 'pg';
import request from 'supertest';
import { createPool } from '../src/database/pool.js';
import { readEnvironment } from '../src/config/environment.js';
import { createApp } from '../src/app.js';
import { createPgTaskRepository } from '../src/tasks/pg-task-repository.js';
import { boardConfigSchema,taskEnvelopeSchema } from '@task-board/contracts';
// @ts-expect-error JavaScript migration runner is shared with deployment.
import { migrate } from '../../../scripts/migrate.mjs';
// @ts-expect-error JavaScript environment helper guards destructive cleanup.
import { testDatabaseUrl } from '../../../scripts/test-env.mjs';
const pool=new pg.Pool({connectionString:testDatabaseUrl(),max:5});
const app=createApp(pool,{general:10000,writes:10000});
let config:ReturnType<typeof boardConfigSchema.parse>;
const fields=(title='Task')=>({title,description:'',statusId:config.defaultStatusId,priorityId:config.defaultPriorityId});
const waitForDatabaseLock = async (pid: number) => {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const activity = await pool.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid]);
    if (activity.rows[0]?.wait_event_type === 'Lock') return;
  }
  throw new Error('The competing PostgreSQL session never waited for the expected lock.');
};
beforeAll(async()=>{await migrate(testDatabaseUrl());const db=await pool.query('SELECT current_database() AS name');expect(db.rows[0].name).toBe('task_board_test');config=boardConfigSchema.parse((await request(app).get('/board-config')).body.data);});
beforeEach(async()=>{await pool.query('DELETE FROM tasks');});
afterAll(async()=>{await pool.end();});
describe('HTTP and PostgreSQL contract',()=>{
 it('serves the same persisted board through the production /api prefix', async () => {
  const configuration = await request(app).get('/api/board-config').expect(200);
  expect(configuration.body.data).toEqual(config);
  const created = await request(app).post('/api/tasks').send(fields('Via API')).expect(201);
  const task = taskEnvelopeSchema.parse(created.body).data;
  const path = `/api/tasks/${task.id}`;
  expect((await request(app).get(path).expect(200)).body.data).toEqual(task);
  const updated = await request(app).put(path).set('If-Match', created.headers.etag).send(fields('Changed')).expect(200);
  expect(updated.body.data).toMatchObject({ title: 'Changed', version: 2 });
  expect((await request(app).get('/api/tasks').expect(200)).body.data).toEqual([updated.body.data]);
  await request(app).delete(path).set('If-Match', updated.headers.etag).expect(204);
  await request(app).get(path).expect(404);
  await request(app).get('/api/board-config?secret=true').expect(422);
 });
 it('rejects a settings shrink after a competing oversized insert commits', async () => {
  const inserting = await pool.connect(), shrinking = await pool.connect();
  const title = 'longer than two';
  try {
   await inserting.query('BEGIN');
   await shrinking.query('BEGIN');
   const task = await createPgTaskRepository(inserting).insert(fields(title));
   const pid = (await shrinking.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
   // Handle the rejection immediately while retaining its result for assertions after commit.
   const shrink = shrinking.query('UPDATE board_settings SET title_max_length=2')
    .then(() => ({ error: null }), error => ({ error }));
   await waitForDatabaseLock(pid);
   await inserting.query('COMMIT');
   expect((await shrink).error).toMatchObject({ code: '23514', constraint: 'board_existing_task_limits' });
   await shrinking.query('ROLLBACK');
   expect((await createPgTaskRepository(pool).findById(task.id))?.title).toBe(title);
   expect((await pool.query('SELECT title_max_length FROM board_settings')).rows[0].title_max_length).toBe(config.titleMaxLength);
  } finally {
   await inserting.query('ROLLBACK');
   await shrinking.query('ROLLBACK');
   await pool.query('DELETE FROM tasks');
   await pool.query('UPDATE board_settings SET title_max_length=$1', [config.titleMaxLength]);
   inserting.release(); shrinking.release();
  }
 });
 it('rejects a competing oversized insert after a settings shrink commits', async () => {
  const shrinking = await pool.connect(), inserting = await pool.connect();
  try {
   await shrinking.query('BEGIN');
   await inserting.query('BEGIN');
   await shrinking.query('UPDATE board_settings SET title_max_length=2');
   const pid = (await inserting.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
   const insert = inserting.query('INSERT INTO tasks(title,description,status_id,priority_id) VALUES($1,$2,$3,$4)',
    ['longer than two', '', config.defaultStatusId, config.defaultPriorityId])
    .then(() => ({ error: null }), error => ({ error }));
   await waitForDatabaseLock(pid);
   await shrinking.query('COMMIT');
   expect((await insert).error).toMatchObject({ code: '23514', constraint: 'tasks_configured_limits' });
   await inserting.query('ROLLBACK');
   expect((await pool.query('SELECT count(*)::int AS count FROM tasks')).rows[0].count).toBe(0);
   expect((await pool.query('SELECT title_max_length FROM board_settings')).rows[0].title_max_length).toBe(2);
  } finally {
   await shrinking.query('ROLLBACK');
   await inserting.query('ROLLBACK');
   // Restore the committed business setting even when an assertion fails.
   await pool.query('DELETE FROM tasks');
   await pool.query('UPDATE board_settings SET title_max_length=$1', [config.titleMaxLength]);
   shrinking.release(); inserting.release();
  }
 });
 it('persists CRUD with timestamps, location, ETags and explicit stale-write failures',async()=>{const created=await request(app).post('/tasks').send({title:'  Task  '}).expect(201);const task=taskEnvelopeSchema.parse(created.body).data;expect(task.title).toBe('Task');expect(created.headers.location).toBe(`/tasks/${task.id}`);expect(created.headers['x-request-id']).toBeTruthy();expect(created.headers['x-content-type-options']).toBe('nosniff');const current=await request(app).get(created.headers.location).expect(200);expect(current.body.data).toEqual(task);const updated=await request(app).put(created.headers.location).set('If-Match',created.headers.etag).send(fields('Edit')).expect(200);expect(updated.body.data.version).toBe(2);expect(updated.body.data.createdAt).toBe(task.createdAt);await request(app).delete(created.headers.location).set('If-Match',created.headers.etag).expect(412);await request(app).put(created.headers.location).set('If-Match',created.headers.etag).send(fields()).expect(412);await request(app).delete(created.headers.location).set('If-Match',updated.headers.etag).expect(204);await request(app).get(created.headers.location).expect(404);expect((await request(app).get('/tasks')).body.data).toEqual([]);});
 it.each([
  ['post','/tasks','{',400,'INVALID_JSON'],['post','/tasks',JSON.stringify({title:'x'.repeat(33000)}),413,'PAYLOAD_TOO_LARGE'],['post','/tasks','{}',422,'VALIDATION_ERROR'],['get','/tasks?sort=title',undefined,422,'VALIDATION_ERROR'],['get','/board-config?secret=true',undefined,422,'VALIDATION_ERROR'],['get','/tasks/bad',undefined,400,'INVALID_ID'],['get',`/tasks/${randomUUID()}`,undefined,404,'TASK_NOT_FOUND'],['patch','/tasks','{}',405,'METHOD_NOT_ALLOWED'],
 ] as const)('returns structured %s %s errors',async(method,path,body,status,code)=>{const call=request(app)[method](path).set('Content-Type','application/json');const response=await(body===undefined?call:call.send(body)).expect(status);expect(response.body.error).toMatchObject({code,requestId:expect.any(String)});});
 it('requires JSON and an exact current task ETag',async()=>{await request(app).post('/tasks').type('text').send('title=Task').expect(415);const created=await request(app).post('/tasks').send(fields()).expect(201);await request(app).put(created.headers.location).send(fields()).expect(428);await request(app).delete(created.headers.location).set('If-Match','*').expect(400);expect((await request(app).get('/tasks')).body.data).toHaveLength(1);});
 it('treats SQL injection text literally and enforces foreign keys and configured database limits',async()=>{const title="'); DROP TABLE tasks; --";const task=await createPgTaskRepository(pool).insert(fields(title));expect((await request(app).get(`/tasks/${task.id}`)).body.data.title).toBe(title);await expect(pool.query('INSERT INTO tasks(title,description,status_id,priority_id) VALUES($1,$2,$3,$4)',['valid','',randomUUID(),config.defaultPriorityId])).rejects.toMatchObject({code:'23503'});await expect(pool.query('INSERT INTO tasks(title,description,status_id,priority_id) VALUES($1,$2,$3,$4)',['x'.repeat(config.titleMaxLength+1),'',config.defaultStatusId,config.defaultPriorityId])).rejects.toMatchObject({constraint:'tasks_configured_limits'});await expect(pool.query('INSERT INTO tasks(title,description,status_id,priority_id) VALUES($1,$2,$3,$4)',['valid','',config.defaultStatusId,randomUUID()])).rejects.toMatchObject({code:'23503'});expect((await pool.query('SELECT count(*)::int AS count FROM tasks')).rows[0].count).toBe(1);});
 it('rolls back task and settings writes using the same checked-out connection',async()=>{const client=await pool.connect();try{await client.query('BEGIN');const repository=createPgTaskRepository(client);const task=await repository.insert(fields());await client.query("UPDATE board_settings SET board_name='Uncommitted'");expect(await repository.findById(task.id)).not.toBeNull();await client.query('ROLLBACK');expect(await repository.findById(task.id)).toBeNull();expect((await request(app).get('/board-config')).body.data.boardName).toBe(config.boardName);}finally{client.release();}});
 it('roundtrips altered labels and defaults and rejects reduced limits that invalidate persisted data',async()=>{const client=await pool.connect();try{await client.query('BEGIN');await client.query("UPDATE task_statuses SET label='Review queue' WHERE id=$1",[config.defaultStatusId]);await client.query("UPDATE board_settings SET title_max_length=2, motion_enabled=false, default_status_id=(SELECT id FROM task_statuses WHERE id<>$1 ORDER BY display_order LIMIT 1), default_priority_id=(SELECT id FROM task_priorities WHERE id<>$2 ORDER BY display_order LIMIT 1)",[config.defaultStatusId,config.defaultPriorityId]);const local=createApp(client);const live=(await request(local).get('/board-config')).body.data;expect(live.statuses.find((s:{id:string})=>s.id===config.defaultStatusId).label).toBe('Review queue');expect(live.motion.enabled).toBe(false);const created=await request(local).post('/tasks').send({title:'😀😀'}).expect(201);expect(created.body.data.statusId).toBe(live.defaultStatusId);expect(created.body.data.priorityId).toBe(live.defaultPriorityId);expect(live.defaultStatusId).not.toBe(config.defaultStatusId);await request(local).post('/tasks').send({title:'😀😀😀'}).expect(422);await expect(client.query('UPDATE board_settings SET title_max_length=1')).rejects.toMatchObject({constraint:'board_existing_task_limits'});}finally{await client.query('ROLLBACK');client.release();}});
 it.each(['update','delete'] as const)('serializes concurrent update against %s and preserves optimistic version checks',async action=>{const task=await createPgTaskRepository(pool).insert(fields());const first=await pool.connect(),second=await pool.connect();try{await first.query('BEGIN');await second.query('BEGIN');const winner=await createPgTaskRepository(first).replace(task.id,1,fields('Win'));expect(winner?.version).toBe(2);const pid=(await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const contender=action==='update'?createPgTaskRepository(second).replace(task.id,1,fields('Lose')):createPgTaskRepository(second).delete(task.id,1);const deadline=Date.now()+5000;let waiting=false;while(Date.now()<deadline){const activity=await pool.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[pid]);if(activity.rows[0]?.wait_event_type==='Lock'){waiting=true;break;}}expect(waiting).toBe(true);await first.query('COMMIT');expect(await contender).toBe(action==='update'?null:false);await second.query('COMMIT');expect((await createPgTaskRepository(pool).findById(task.id))?.title).toBe('Win');}finally{await first.query('ROLLBACK');await second.query('ROLLBACK');first.release();second.release();}});
 it('maps real lock timeouts to retryable errors without altering a locked task',async()=>{const task=await createPgTaskRepository(pool).insert(fields());const lock=await pool.connect(),blocked=await pool.connect();try{await lock.query('BEGIN');await lock.query('SELECT id FROM tasks WHERE id=$1 FOR UPDATE',[task.id]);await blocked.query("SET lock_timeout='30ms'");const response=await request(createApp(blocked)).delete(`/tasks/${task.id}`).set('If-Match',`"${task.id}:1"`).expect(503);expect(response.headers['retry-after']).toBe('1');expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');}finally{await lock.query('ROLLBACK');await blocked.query('RESET lock_timeout');lock.release();blocked.release();}expect(await createPgTaskRepository(pool).findById(task.id)).not.toBeNull();});
 it('applies connection timeouts and bounded pool size to actual PostgreSQL sessions',async()=>{const configured=createPool(readEnvironment({DATABASE_URL:testDatabaseUrl(),DB_POOL_MAX:'2',DB_STATEMENT_TIMEOUT_MS:'500',DB_LOCK_TIMEOUT_MS:'100'}));try{expect((await configured.query('SHOW statement_timeout')).rows[0].statement_timeout).toBe('500ms');expect((await configured.query('SHOW lock_timeout')).rows[0].lock_timeout).toBe('100ms');}finally{await configured.end();}});
 it('returns conflict when an exhausted task version would overflow without changing it',async()=>{const task=await createPgTaskRepository(pool).insert(fields());await pool.query('UPDATE tasks SET version=2147483647 WHERE id=$1',[task.id]);const response=await request(app).put(`/tasks/${task.id}`).set('If-Match',`"${task.id}:2147483647"`).send(fields('Edit')).expect(409);expect(response.body.error.code).toBe('VERSION_EXHAUSTED');expect((await createPgTaskRepository(pool).findById(task.id))?.title).toBe('Task');});
 it('provides explicit throttling feedback with request identity',async()=>{const limited=createApp(pool,{general:2,writes:1});await request(limited).post('/tasks').send(fields()).expect(201);const response=await request(limited).post('/tasks').send(fields()).expect(429);expect(response.body.error).toMatchObject({code:'RATE_LIMITED',requestId:response.headers['x-request-id']});await request(limited).get('/tasks').expect(429);});
 it('reports unavailable PostgreSQL readiness while liveness remains usable',async()=>{const offline=new pg.Pool({host:'127.0.0.1',port:1,database:'task_board_test',connectionTimeoutMillis:100});try{const unavailable=createApp(offline);await request(unavailable).get('/health/live').expect(200);await request(unavailable).get('/health/ready').expect(503);await request(unavailable).get('/tasks').expect(503);}finally{await offline.end();}});
});
