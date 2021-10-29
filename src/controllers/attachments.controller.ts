import { Body, Controller, Get, Post, UploadedFile, UploadedFiles, UseInterceptors, Param, StreamableFile } from '@nestjs/common';
import { AttachmentService } from '../services';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream } from 'fs';
import { Record } from '../model';
import { API_TCPA_SCRUB_BULK, TCPA_USERNAME, TCPA_SECRET } from '../utils';
const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');

@Controller('attachment/v1.0')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) { }
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: 'dist/public'
      , filename: (req, file, cb) => {
        // Generating a 32 random chars long string
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
        //Calling the callback passing the random name generated with the original extension name
        cb(null, `${randomName}${extname(file.originalname)}`)
      }
    })
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {   
    //, @Body() request: Record)
    // if (request.enable_scrub) {
    //   const phones = [];
    //   return new Promise((resolve, reject) => {
    //     fs.createReadStream(file.path)
    //       .pipe(csv())
    //       .on('data', (data) => {
    //         phones.push(data.phone_number);
    //       }).on('end', async () => {
    //         const params = {
    //           phones: phones,
    //           type: ["tcpa", "dnc"]
    //         };
    //         const res = await this.scrubPhones(params);
    //         //console.log('============res', res);
    //         resolve({ message: 'Uploaded successfully with Scrub', filename: file.filename, tcpa_res: res });
    //       }).on('error', reject);
    //   })
    // }
    return { file }
   // return { message: 'Uploaded successfully', filename: file.filename }
  }

  //@Post('mass/scrub/phones')
  async scrubPhones(request: Record): Promise<any> {
    const requestParams = `phones=[${request.phones}]&type=[${request.type}]`;
    const apiUrl = `${API_TCPA_SCRUB_BULK}`;
    //console.log(apiUrl);
    //console.log(requestParams);
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
    try {
      console.log(params.fileId);
      const file = createReadStream('dist/public/' + params.fileId);
      return new StreamableFile(file);
    } catch (ex) {
      console.error("error while downloading the file", ex);
    }
  }

}
