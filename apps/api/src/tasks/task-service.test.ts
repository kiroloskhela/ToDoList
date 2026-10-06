import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { configFixture } from '../../test/fixtures.js';
import { createTaskService } from './task-service.js';
import type { Task } from './task-types.js';
import type { TaskRepository } from './task-repository.js';
const setup = () => {
  const config = configFixture(); const rows = new Map<string,Task>();
  const repository: TaskRepository = {
    insert:vi.fn(async fields => { const task={...fields,id:randomUUID(),version:1,createdAt:new Date(),updatedAt:new Date()}; rows.set(task.id,task); return task; }),
    list:async()=>[...rows.values()],findById:async id=>rows.get(id)??null,
    replace:async(id,version,fields)=> {const old=rows.get(id);if(!old||old.version!==version)return null;const next={...old,...fields,version:version+1,updatedAt:new Date()};rows.set(id,next);return next;},
    delete:async(id,version)=>rows.get(id)?.version===version&&rows.delete(id),
  };
  return {config,rows,repository,service:createTaskService(repository,{get:async()=>config})};
};
describe('task service',()=>{
  it('uses live configuration defaults and normalizes title before persistence',async()=>{const {service,config}=setup();config.defaultStatusId=randomUUID();config.statuses.push({...config.statuses[0]!,id:config.defaultStatusId});const task=await service.create({title:'  😀😀😀😀  '});expect(task).toMatchObject({title:'😀😀😀😀',description:'',statusId:config.defaultStatusId,priorityId:config.defaultPriorityId});expect(task.createdAt).toBeInstanceOf(Date);expect(await service.get(task.id)).toEqual(task);expect(await service.list()).toEqual([task]);});
  it.each([{title:''},{title:'     '},{title:'12345'},{title:'ok',description:'123456789'},{title:'ok',statusId:randomUUID()},{title:'ok',priorityId:randomUUID()},{title:'ok',description:'\0'},{title:'ok',extra:true},null])('rejects invalid creation without changing persisted state: %j',async input=>{const {service,rows}=setup();await expect(service.create(input)).rejects.toMatchObject({code:'VALIDATION_ERROR',fields:expect.any(Object)});expect(rows.size).toBe(0);});
  it('replaces all fields with a new version and rejects stale edits and deletion',async()=>{const {service}=setup();const task=await service.create({title:'old'});const updated=await service.replace(task.id,{title:'new',description:'changed',statusId:task.statusId,priorityId:task.priorityId},1);expect(updated).toMatchObject({title:'new',description:'changed',version:2,createdAt:task.createdAt});await expect(service.replace(task.id,{...task,title:'lost'},1)).rejects.toMatchObject({code:'VALIDATION_ERROR'});await expect(service.replace(task.id,{title:'lost',description:'',statusId:task.statusId,priorityId:task.priorityId},1)).rejects.toMatchObject({code:'PRECONDITION_FAILED'});await expect(service.delete(task.id,1)).rejects.toMatchObject({code:'PRECONDITION_FAILED'});await service.delete(task.id,2);await expect(service.get(task.id)).rejects.toMatchObject({code:'TASK_NOT_FOUND'});await expect(service.delete(task.id,2)).rejects.toMatchObject({code:'TASK_NOT_FOUND'});await expect(service.replace(task.id,{title:'new',description:'',statusId:task.statusId,priorityId:task.priorityId},2)).rejects.toMatchObject({code:'TASK_NOT_FOUND'});});
  it.each([0,-1,1.5,2147483648,'1'])('rejects invalid expected versions %s before changing state',async version=>{const {service}=setup();const task=await service.create({title:'ok'});await expect(service.delete(task.id,version)).rejects.toMatchObject({code:'INVALID_VERSION'});await expect(service.replace(task.id,{},version)).rejects.toMatchObject({code:'INVALID_VERSION'});expect(await service.get(task.id)).toEqual(task);});
  it('rejects malformed IDs and incomplete replacement bodies',async()=>{const {service}=setup();await expect(service.get('bad')).rejects.toMatchObject({code:'INVALID_ID'});await expect(service.delete('bad',1)).rejects.toMatchObject({code:'INVALID_ID'});await expect(service.replace('bad',{},1)).rejects.toMatchObject({code:'INVALID_ID'});const task=await service.create({title:'ok'});await expect(service.replace(task.id,{title:'ok'},1)).rejects.toMatchObject({code:'VALIDATION_ERROR'});expect(await service.get(task.id)).toEqual(task);});
  it('surfaces database and configuration failures instead of reporting success',async()=>{const {repository}=setup();const failure=new Error('connection unavailable');repository.insert=async()=>{throw failure;};await expect(createTaskService(repository,{get:async()=>configFixture()}).create({title:'ok'})).rejects.toBe(failure);await expect(createTaskService(repository,{get:async()=>{throw failure;}}).create({title:'ok'})).rejects.toBe(failure);});
});
