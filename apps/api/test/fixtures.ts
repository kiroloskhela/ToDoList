import { randomUUID } from 'node:crypto';
import { boardConfigSchema } from '@task-board/contracts';
export const configFixture = () => {
  const statusId = randomUUID(), priorityId = randomUUID();
  return boardConfigSchema.parse({brandName:'Test',boardName:'Shared board',description:'',defaultStatusId:statusId,defaultPriorityId:priorityId,titleMaxLength:4,descriptionMaxLength:8,motion:{enabled:true,durationMs:200,staggerMs:20,easing:'power2.out'},statuses:[{id:statusId,label:'Custom column',description:'',color:'#123456',displayOrder:10,isComplete:false}],priorities:[{id:priorityId,label:'Custom priority',color:'#abcdef',displayOrder:20}]});
};
