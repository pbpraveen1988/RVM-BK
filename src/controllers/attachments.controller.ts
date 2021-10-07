import { Body, Controller, Get, Post, UploadedFile, UploadedFiles, UseInterceptors, Param, StreamableFile } from '@nestjs/common';
import { AttachmentService } from '../services';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream } from 'fs';
import { Utils } from '../utils';
const axios = require('axios');
const API_TCPA_SCRUB_BULK = 'https://api.tcpalitigatorlist.com/scrub/phones';
const TCPA_USERNAME = 'tcpa_PpTkL5xMr4';
const TCPA_SECRET = 'ysBE rcAi ZuD0 vWwn nb8w Wl91';

@Controller('attachment/v1.0')
export class AttachmentController {
    constructor(private readonly attachmentService: AttachmentService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './src/public'
            , filename: (req, file, cb) => {
                // Generating a 32 random chars long string
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
                //Calling the callback passing the random name generated with the original extension name
                cb(null, `${randomName}${extname(file.originalname)}`)
            }
        })
    }))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        return { file }
    }

    @Post('mass/scrub/phones')
    async scrubPhones(@Param() params): Promise<any> {
      console.log(params);
      const res = await axios.post(API_TCPA_SCRUB_BULK, params, {
        auth: {
          username: TCPA_USERNAME,
          password: TCPA_SECRET
        }
      })
      return res;
    }

    @Get('download/:fileId')
    getFile(@Param() params): StreamableFile {
        console.log(params.fileId);
        const file = createReadStream('./src/public/' + params.fileId);
        return new StreamableFile(file);
    }

}
