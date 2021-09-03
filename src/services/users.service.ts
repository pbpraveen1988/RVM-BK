import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    const data: any = await Utils.executeQuery(queryString);
    if (data && data.length > 0) {
      return data[0];
    }
    throw new HttpException('Invalid Username or Password', HttpStatus.UNAUTHORIZED);
  }
}
