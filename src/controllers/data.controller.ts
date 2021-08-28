import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DataService } from '../services';
import { QueryParams, Record } from '../model';

@Controller('data/v1.0')
export class DataController {
  constructor(private readonly dataService: DataService) { }


  @Get(':object')
  async getList(@Param() params, @Query() query: QueryParams): Promise<any> {
    return await this.dataService.getList(params.object, query);
  }

  @Get(':object/:recordId')
  async getRecord(@Param() params) {
    return await this.dataService.getRecord(params.object, params.recordId);
  }

  @Delete(':object/:recordId')
  async deleteRecord(@Param() params) {
    return await this.dataService.deleteRecord(params.object, params.recordId)
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
