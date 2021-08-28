import { Injectable } from '@nestjs/common';
import { QueryBuilder } from '../utils/QueryBuilder';
import { QueryParams, Record } from '../model';
import { Z_DATA_ERROR } from 'zlib';

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

    async getRecord(object: string, recordId: string) {
        const _data = await QueryBuilder.getRecord(object, recordId);
        return _data;
    }

    async deleteRecord(object: string, recordId: string) {
        const data = await QueryBuilder.deleteRecord(object, recordId)
        return data;
    }
}
