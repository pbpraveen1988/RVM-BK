import { Injectable } from '@nestjs/common';
import { QueryBuilder, Utils } from 'src/utils';
import { Record } from '../model';

@Injectable()
export class UserService {
  async register(request: Record): Promise<any> {
    const _data = await QueryBuilder.saveRecord('users', request);
    return _data;
  }


  async signIn(request: Record): Promise<any> {
    let queryString = `SELECT * from users where email = '${request.email}' AND password = '${request.password}'`;
    const data = await Utils.executeQuery(queryString);
    return data;
  }
}
