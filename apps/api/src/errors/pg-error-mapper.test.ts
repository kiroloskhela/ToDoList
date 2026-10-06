import { expect,it } from 'vitest';
import { mapPgError } from './pg-error-mapper.js';
it.each(['08006','57014','55P03','57P01','57P02','57P03','ECONNREFUSED','ECONNRESET','ETIMEDOUT'])('classifies database failure %s as retryable',code=>{expect(mapPgError(Object.assign(new Error('failure'),{code}))).toMatchObject({code:'DATABASE_UNAVAILABLE'});});
it.each(['connection terminated','timeout while waiting'])('recognizes driver failures without PostgreSQL codes: %s',message=>{expect(mapPgError(new Error(message))).toMatchObject({code:'DATABASE_UNAVAILABLE'});});
it.each([{code:'23503'},{code:'23514',constraint:'tasks_configured_limits'}])('classifies changed configuration as validation error: %j',details=>{expect(mapPgError(Object.assign(new Error('failure'),details))).toMatchObject({code:'VALIDATION_ERROR'});});
it('distinguishes exhausted versions, unknown failures and non-error thrown values',()=>{expect(mapPgError(Object.assign(new Error('overflow'),{code:'22003'}))).toMatchObject({code:'VERSION_EXHAUSTED'});const error=new Error('unexpected');expect(mapPgError(error)).toBe(error);expect(mapPgError(null)).toBeInstanceOf(Error);});
