import { Injectable } from '@nestjs/common';
import { Utils } from 'src/utils';
import { QueryBuilder } from '../utils/QueryBuilder';
import { Cron, CronExpression } from '@nestjs/schedule';
const csv = require('csv-parser');
const path = require('path');
const fs = require('fs');
const got = require('got');

@Injectable()
export class CampaignService {

    private static Carrier: string;

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
        const queryString = `SELECT c.id,c.start_date,c.end_date,csv.filename,csv.totalCount,c.intervalMinute,c.lastIndex, a.filename as audio_filename
        FROM campaign c
        INNER JOIN csvfile csv ON c.csvfile_id = csv.id
        INNER JOIN audio a ON a.id = c.audio_id
        WHERE c.status = 1 AND c.isCalling = 0`;
        const campaignList: Array<any> = await Utils.executeQuery(queryString);
        campaignList && campaignList.forEach(campaign => {
            try {
                if (new Date(campaign.start_date) <= new Date() || new Date(campaign.end_date) <= new Date()) {
                    let counter = 0;
                    let numbers = [];
                    fs.createReadStream('src/public/' + campaign.filename)
                        .pipe(csv())
                        .on('data', data => {
                            if (counter++ >= campaign.lastIndex && counter <= campaign.lastIndex + campaign.intervalMinute) {
                                numbers.push(data);
                            }
                        })
                        .on('end', async () => {
                            if (numbers.length) {
                                const _numberWithCarriers = [];
                                const linesArray = [];
                                const dblines = await Utils.getLines();
                                const _inuse = [];
                                for (const number of numbers) {
                                    const _carrier: string = await Utils.getCarrier(number) as string;
                                    dblines && dblines.forEach(element => {
                                        if (_inuse.findIndex(x => x.phone == element.phone) == -1) {
                                            _inuse.push({ id: element.id, phone: element.phone });
                                            _numberWithCarriers.push({
                                                carrier: _carrier,
                                                phone: element.phone,
                                                xref: element.xref,
                                                number: number
                                            });
                                        }
                                    });
                                }
                                const query = `UPDATE xreflines SET inUse = 1 WHERE id IN (${_inuse.map(x => x.id).join(',')})`
                                await Utils.executeQuery(query);
                                const _verizonNumbers = _numberWithCarriers.filter(x => x.carrier == 'VERIZON');
                                const _tmobile = _numberWithCarriers.filter(x => x.carrier == 'T-MOBILE');
                                const _attCingular = _numberWithCarriers.filter(x => x.carrier == 'CINGULAR');
                                
                            }
                        })
                }
            } catch (ex) {
                console.error('Exception => ', ex.message);
            }
        });
    }
}
