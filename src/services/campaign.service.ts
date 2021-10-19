import { Injectable } from '@nestjs/common';
import { Utils } from 'src/utils';
import { QueryBuilder } from '../utils/QueryBuilder';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { Record } from '../model';
import { Constants } from '../utils/constants';
const csv = require('csv-parser');
const path = require('path');
const fs = require('fs');
const faktory = require("faktory-worker");

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
        try {
            console.log("================INside TRY BLOCK============");
            const client = await faktory.connect({
                host: 'tcp://:8ab081c0bfdc2175@3.145.3.203',
                port: 7419
            });
            await client.job("OriginateCallJob", { carrier: "verizon", audio_uri: "https://some.domain.com/some/path/to/file.wav", vm_numbers: [{ number: "6156678565" }, { number: "8304463687" }] }).push();
            await client.close(); // reuse client if possible! remember to disconnect!
            console.log("==========INSIDE BLOCK COMPLETED==============");
        } catch (ex) {
            console.log("INSIDE EXCEPTION");
            console.error(ex);
        }

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
                                await QueryBuilder.updateRecord('campaign', campaign.id, { isCalling: true })
                                const _numberWithCarriers: Record[] = [];
                                for (const number of numbers) {
                                    const _carrier: string = await Utils.getCarrier(number) as string;
                                    _numberWithCarriers.push({
                                        carrier: _carrier,
                                        number: number
                                    })
                                }
                                const verizonCarriers: Record[] = _numberWithCarriers.filter(x => x.carrier == 'VERIZON').map(y => { return { number: y.number } });
                                const tmobileCarriers: Record[] = _numberWithCarriers.filter(x => x.carrier == 'T-MOBILE').map(y => { return { number: y.number } });
                                const attCarriers: Record[] = _numberWithCarriers.filter(x => x.carrier == 'CINGULAR').map(y => { return { number: y.number } });
                                // Create DROP request for VERIZON carrier 
                                const _verizonRequest = Utils.makeRequestForAsterisk(campaign, verizonCarriers, 'VERIZON');
                                // Create DROP request for T-MOBILE carrier
                                const _tmobileRequest = Utils.makeRequestForAsterisk(campaign, verizonCarriers, 'T-MOBILE');
                                // Create DROP request for CINGULAR carrier
                                const _attRequest = Utils.makeRequestForAsterisk(campaign, verizonCarriers, 'CINGULAR');

                                const client = await faktory.connect();
                                var i, j, temporary, chunk = Constants.BatchSize;
                                for (i = 0, j = verizonCarriers.length; i < j; i += Constants.BatchSize) {
                                    temporary = verizonCarriers.slice(i, i + chunk);
                                    await client.job("OriginateCallJob", temporary).push();
                                }

                                await client.close();




                                // await Promise.all([
                                //     axios.post(Constants.AsteriskUrl, _verizonRequest),
                                //     axios.post(Constants.AsteriskUrl, _tmobileRequest),
                                //     axios.post(Constants.AsteriskUrl, _attRequest),
                                // ]).then(async response => {
                                //     const isCallCompleted = campaign.lastIndex + campaign.intervalMinute > counter ? true : false;
                                //     await QueryBuilder.updateRecord('campaign', campaign.id, {
                                //         totalCount: counter,
                                //         lastIndex: isCallCompleted ? 0 : campaign.lastIndex + campaign.intervalMinute,
                                //         isCalling: false,
                                //         campaignStatus: !isCallCompleted,
                                //     })

                                // }).catch(exception => {
                                //     console.error(exception);
                                // })
                            }
                        })
                }
            } catch (ex) {
                console.error('Exception => ', ex.message);
            }
        });
    }
}
