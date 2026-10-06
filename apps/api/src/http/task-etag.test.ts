import { randomUUID } from 'node:crypto';
import { expect,it } from 'vitest';
import { parseTaskEtag } from './task-etag.js';
const id=randomUUID();
it('accepts case-insensitive task identity and bounded positive versions',()=>{expect(parseTaskEtag(`"${id.toUpperCase()}:2147483647"`,id)).toBe(2147483647);});
it('requires a current version',()=>{expect(()=>parseTaskEtag(undefined,id)).toThrow(expect.objectContaining({code:'PRECONDITION_REQUIRED'}));});
it.each(['*','',`W/"${id}:1"`,`"${id}:0"`,`"${id}:01"`,`"${id}:2147483648"`,`"${randomUUID()}:1"`,`"${id}:1", "${id}:2"`])('rejects ambiguous or invalid ETag %s',header=>{expect(()=>parseTaskEtag(header,id)).toThrow(expect.objectContaining({code:'INVALID_ETAG'}));});
it('rejects invalid task identity even with matching header',()=>{expect(()=>parseTaskEtag('"bad:1"','bad')).toThrow(expect.objectContaining({code:'INVALID_ETAG'}));});
