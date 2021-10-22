import { Utils } from './Utils';
import { QueryParams, Record } from '../model';
import { HttpException, HttpStatus } from '@nestjs/common';


export class QueryBuilder {

    public static async getRecord(object: string, recordId: string) {
        if (object && recordId) {
            const queryString = `Select * from ${object} where id = '${recordId}' `;
            const _data = await Utils.executeQuery(queryString);
            if (_data) {
                return _data[0];
            } else {
                return {}
            }
        } else {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        }
    }

    public static async deleteRecord(object: string, recordId: string | number) {
        if (object && recordId) {
            const queryString = `DELETE from ${object} where id = ${recordId} `;
            await Utils.executeQuery(queryString);
        } else {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        }
    }


    public static async updateRecord(object: string, recordId: string, request: Record) {
        if (object && recordId && request) {
            let columns = ' ';
            Object.keys(request).forEach(x => {
                columns += `${x} = '${request[x]}',`;
            })
            const queryString = `UPDATE ${object} SET ${columns.slice(0, -1)} WHERE id = ${recordId}`;
            return await Utils.executeQuery(queryString);
        } else {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        }
    }

    public static async bulkInsert(object: string, request: Record[]) {
        if (request && object) {
            request.forEach(async x => {
                try {
                    await QueryBuilder.saveRecord(object, x);
                } catch (ex) {

                }
            })
        }
    }

    public static async saveRecord(object: string, request: Record) {
        if (request && object) {
            let columns = ' ', values = ' ';
            Object.keys(request).forEach(x => {
                columns += `${x},`
                values += `'${request[x]}',`;
            })

            const queryString = `INSERT INTO ${object} (${columns.slice(0, -1)}) VALUES (${values.slice(0, -1)})`;
            const savedRecord: Record = await Utils.executeQuery(queryString);
            return await Utils.executeQuery(`SELECT * from ${object} where id = ${savedRecord.insertId}`)

        } else {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        }
    }

    public static createWhereStatement = (whereClause: string): string => {
        const _whereClauses = whereClause.split(',');
        let _whereString = '';
        _whereClauses.forEach((value: string, index: number) => {
            console.log(value);
            if (index !== 0) {
                _whereString += ' AND '
            }
            if (value.includes('=')) {
                const _valueEquals = value.split('=');
                if (_valueEquals[1] && _valueEquals[1].includes(',')) {
                    console.log(',')
                } else if (_valueEquals[1] && _valueEquals.includes(':')) {
                    console.log(':');
                } else {
                    console.log('else');
                    _whereString += value;
                }
            }
        });
        return ` where ${_whereString}`;
    }


    public static Select = async (tableName: string, queryParams?: QueryParams): Promise<Object> => {
        let queryString = '';
        let page_number = queryParams.page_number || 1;
        let page_size = queryParams.page_size || 50;
        if (queryParams && queryParams.select) {
            const _fields = queryParams.select === 'all' ? '*' : queryParams.select;
            queryString = `Select ${_fields} from ${tableName} `;
        } else {
            queryString = `Select id,name from ${tableName} `;
        }

        if (queryParams && queryParams.where) {
            queryString += QueryBuilder.createWhereStatement(queryParams.where);
        }

        if (queryParams && queryParams.order_by) {

        } else {
            queryString += ' ORDER BY updated_at DESC';
        }
        console.log(queryString);
        return await Utils.executeQuery(queryString);
    }
}
