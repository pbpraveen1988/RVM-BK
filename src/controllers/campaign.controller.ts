import { Body, Controller, Get, Post, UploadedFile, UploadedFiles, UseInterceptors, Param, StreamableFile } from '@nestjs/common';
import { CampaignService } from '../services';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream } from 'fs';
import { Utils } from '../utils';


@Controller('campaign/v1.0')
export class CampaignController {
    constructor(private readonly campaignService: CampaignService) { }

    @Get('/get-history/:id')
    async getHistory(@Param() params): Promise<any> {
        console.log(params);
        return await this.campaignService.getHistory(params.id);
    }


    @Post('/saveLines/:id')
    async saveLines(@Param() params): Promise<any> {
        return await this.campaignService.saveLines(params.id);
    }

}
