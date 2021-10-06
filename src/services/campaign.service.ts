import { Injectable } from '@nestjs/common';
import { Utils } from 'src/utils';
import { QueryBuilder } from '../utils/QueryBuilder';
import { Cron, CronExpression } from '@nestjs/schedule';
const csv = require('csv-parser');
const path = require('path');
const fs = require('fs');

@Injectable()
export class CampaignService {
    async getHistory(id: any) {
        const queryString = 'Select * from callhistory where campaignId = ' + id;
        const campaignData = await QueryBuilder.getRecord('campaign', id);
        const _data: Array<any> = await Utils.executeQuery(queryString);
        if (_data && campaignData) {
            const _successCount = _data.filter(x => x.status == 'Success').length;
            const _failedCount = _data.filter(x => x.status == 'Failed').length;
            const _pendingCount = _data.filter(x => x.status == 'Pending').length;
            const _processingCount = campaignData.total - (_successCount + _pendingCount + _failedCount);
            return {
                success: _successCount,
                pending: _pendingCount,
                processing: _processingCount,
                failed: _failedCount
            };
        }
    }

    async saveLines(id: any) {
        fs.createReadStream('src/public/' + id)
            .pipe(csv())
            .on('data', async data => {
                if (data) {
                    console.log(data);
                    await QueryBuilder.saveRecord('xreflines', {
                        phone: data.phone,
                        xref: data.xref,
                        carrier: data.carrier,
                        active: 1,
                        inUse: 0,
                        errorCount: 0
                    });

                }
            }).on('end', () => {
                console.log('end event');
            })
    }


    @Cron('* * * * *')
    async handleCampaignCron() {
        console.log('CRON DATE', new Date());

        const queryString = 'Select * from campaign where status = 1 AND isCalling = 0';
        const _data: Array<any> = await Utils.executeQuery(queryString);
        _data && _data.forEach(data => {
            if (new Date(data.start_date) <= new Date() || new Date(data.end_date) >= new Date()) {
                console.log("inside loop.")
                


            }
        });

    }
}
