import { Injectable } from '@nestjs/common';
import { QueryBuilder } from '../utils/QueryBuilder';
import { QueryParams, Record } from '../model';

@Injectable()
export class DataService {
    async getList(object: string, query: QueryParams): Promise<any> {
        const _data = await QueryBuilder.Select(object, query);
        return _data;
    }

    async saveRecord(object: string, request: Record): Promise<any> {
        const _data = await QueryBuilder.saveRecord(object, request);
        return _data;
    }

    async updateRecord(object: string, recordId: string, request: Record): Promise<any> {
        const _data = await QueryBuilder.updateRecord(object, recordId, request);
        return _data;
    }
}
