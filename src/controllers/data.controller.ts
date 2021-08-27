import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DataService } from '../services';
import { QueryParams, Record } from '../model';

@Controller('data/v1.0')
export class DataController {
  constructor(private readonly dataService: DataService) { }


  @Get(':object')
  async getList(@Param() params, @Query() query: QueryParams): Promise<any> {
    return await this.dataService.getList(params.object, query);
  }


  @Post(':object')
  async saveRecord(@Param() params, @Body() request: Record): Promise<any> {
    return await this.dataService.saveRecord(params.object, request);
  }

  @Patch(':object/:recordId')
  async updateRecord(@Param() params, @Body() request: Record): Promise<any> {
    return await this.dataService.updateRecord(params.object, params.recordId, request);
  }

}
