import { Body, Controller, Get, Post, UploadedFile, UploadedFiles, UseInterceptors, Param, StreamableFile } from '@nestjs/common';
import { AttachmentService } from '../services';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream } from 'fs';
import { Utils } from '../utils';


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




    @Get('download/:fileId')
    getFile(@Param() params): StreamableFile {
        console.log(params.fileId);
        const file = createReadStream('./src/public/' + params.fileId);
        return new StreamableFile(file);
    }

}
