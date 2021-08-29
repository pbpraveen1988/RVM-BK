import { Injectable } from '@nestjs/common';
import { QueryBuilder } from '../utils/QueryBuilder';
import { QueryParams, Record } from '../model';
import * as fs from 'fs';
import * as path from 'path';
const multer = require('multer');


// const storage = multer.diskStorage({
//     destination: constants.VARHTML +  constants.PUBLIC_FOLDER_NAME + constants.ASSET_FOLDER_PATH,
//     filename: function (req, file, cb) {
//       cb(null, file.fieldname + utils.generateRandomId() + path.extname(file.originalname));
//     }
//   });

@Injectable()
export class AttachmentService {
    async upload(record: Record): Promise<any> {
        let folderName = record.folderName;
        
    }

    async download(record: Record): Promise<any> {
       
    }
}
