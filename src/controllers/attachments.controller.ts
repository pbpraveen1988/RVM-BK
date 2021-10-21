import { Body, Controller, Get, Post, UploadedFile, UploadedFiles, UseInterceptors, Param, StreamableFile } from '@nestjs/common';
import { AttachmentService } from '../services';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream } from 'fs';
import { Record } from '../model';
import { API_TCPA_SCRUB_BULK, TCPA_USERNAME, TCPA_SECRET} from '../utils';
const axios = require('axios');
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
    async scrubPhones(@Body() request: Record): Promise<any> {
      const requestParams = `phones=[${request.phones}]&type=[${request.type}]`;
      const apiUrl = `${API_TCPA_SCRUB_BULK}`;
      console.log(apiUrl);
      const res = await axios.post(apiUrl, requestParams, {
        auth: {
          username: TCPA_USERNAME,
          password: TCPA_SECRET
        },
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      return res.data;
    }

    @Get('download/:fileId')
    getFile(@Param() params): StreamableFile {
        console.log(params.fileId);
        const file = createReadStream('./src/public/' + params.fileId);
        return new StreamableFile(file);
    }

}
