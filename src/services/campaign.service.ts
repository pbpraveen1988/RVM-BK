import { Injectable } from '@nestjs/common';
import { Utils, API_TCPA_SCRUB_STATUS, TCPA_USERNAME, TCPA_SECRET } from '../utils';
import { QueryBuilder } from '../utils/QueryBuilder';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { Record } from '../model';
import { Constants } from '../utils/constants';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';
const csv = require('csv-parser');
const path = require('path');
const fs = require('fs');
const faktory = require("faktory-worker");
const converter = require('json-2-csv');

@Injectable()
export class CampaignService {

  private static Carrier: string;

  async getHistory(id: any) {
    const queryString = 'SELECT STATUS,COUNT(STATUS),SUM(numberCount) AS countNumber FROM job_status WHERE campaign_id = ' + id + ' GROUP BY STATUS';
    const dataString = 'SELECT c.totalCount,c.totalCleanCount,camp.csvfile_id from campaign camp,csvfile c where c.id = camp.csvfile_id AND camp.id =' + id;
    const campaignData: Record = await Utils.executeQuery(dataString);
    const _data: Array<any> = await Utils.executeQuery(queryString);
    try {
      if (_data && campaignData) {
        let _successCount = 0;
        let _failedCount = 0;
        let _pendingCount = 0;
        let _processingCount = 0;

        if (_data.filter(x => x.STATUS == "processed").length > 0) {
          _successCount = _data.find(x => x.STATUS == 'processed').countNumber;
        }
        if (_data.filter(x => x.STATUS == "failed").length > 0) {
          _failedCount = _data.find(x => x.STATUS == 'failed').countNumber;
        }
        if (_data.filter(x => x.STATUS == "dead").length > 0) {
          _failedCount += _data.find(x => x.STATUS == 'dead').countNumber;
        }

        // if (_data.filter(x => x.status == "sent").length > 0) {
        //   _pendingCount = _data.find(x => x.status == 'sent').countNumber;
        // }
        if (_data.filter(x => x.status == "sent").length > 0) {
          _processingCount = _data.find(x => x.status == 'sent').countNumber;
        }

        _pendingCount = parseInt(campaignData[0].totalCleanCount) - (parseInt(_successCount.toString()) + parseInt(_processingCount.toString()) + parseInt(_failedCount.toString()));

        if (_pendingCount == undefined || _pendingCount == null) {
          _pendingCount = 0;
        }

        return {
          success: _successCount,
          pending: _pendingCount,
          processing: _processingCount,
          failed: _failedCount
        };
      }
    } catch (ex) {
      console.error(ex);
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

  @Cron(CronExpression.EVERY_MINUTE)
  async handleInQueueCSVCron() {
    console.log('handleInQueueCSVCron: CRON DATE', new Date());
    const sql = `select id,filename,tcpa_job_queue_id from csvfile where tcpa_job_queue_status='in_queue'`;
    const queueCsvList: Array<any> = await Utils.executeQuery(sql);
    queueCsvList && queueCsvList.forEach(async csvfile => {
      try {

        const res = await axios.post(`${API_TCPA_SCRUB_STATUS}?key=${csvfile.tcpa_job_queue_id}`, {}, {
          auth: {
            username: TCPA_USERNAME,
            password: TCPA_SECRET
          }
        })
        if (res) {
          const data: any = res.data;
          let tcpaRecords = [];
          let dncRecords = [];
          let cleanRecords = [];
          if (data.match) {
            const item = data.match;
            for (let key in item) {
              if (item[key].status == 'TCPA') {
                tcpaRecords.push(item[key]);
              }
              if (item[key].status == 'DNC_COMPLAINERS') {
                dncRecords.push(item[key]);
              }
            }
          }
          if (data.clean) {
            const item = data.clean;
            for (let key in item) {
              cleanRecords.push(item[key]);
            }
            // print CSV string
            console.log(csv);

            console.log('*****cleanRecords')
            //console.log(cleanRecords);
            // convert JSON array to CSV string
            converter.json2csv(cleanRecords, async (err, csvRecord) => {
              if (err) {
                throw err;
              }
              // print CSV string
              console.log('*****csvRecord')
              //console.log(csvRecord);

              // write CSV to a file

              try {
                const fileName = `${path.parse(csvfile.filename).name}_clean.csv`;
                fs.writeFileSync(`dist/public/${fileName}`, csvRecord);
                await QueryBuilder.updateRecord('csvfile', csvfile.id, {
                  filename: fileName,
                  tcpa_job_queue_status: 'completed',
                  tcpa_response_json: JSON.stringify(data),  // need to upload file into S3
                  status: 'active',
                  totalTcpaCount: tcpaRecords.length,
                  totalDncCount: dncRecords.length,
                  totalCleanCount: cleanRecords.length
                })
              } catch (ex) {
                console.error(ex);
              }

            });
          }
        }

      } catch (ex) {
        console.error('handleInQueueCSVCron:Exception => ', ex.message);
      }
    });
  }

  private checkLimit = 0;
  @Cron(CronExpression.EVERY_MINUTE)
  async handleToUpdateJobStatus() {
    const queryString = `SELECT job_id FROM job_status where status = 'sent' LIMIT ${this.checkLimit}, 50`;
    const jobsList: Array<any> = await Utils.executeQuery(queryString);
    if (jobsList && jobsList.length) {
      const url = 'http://nmgr.reachoutinc.net:3000/api/bulk_job_status';
      const postBody = jobsList.map(x => x.job_id);
      const _responsebody = await axios.post(url, { job_ids: postBody }).catch(ex => console.error(ex));
      if (_responsebody && _responsebody.data) {
        for (const jobid in _responsebody.data) {
          if (_responsebody.data[jobid] != "unknown") {
            await Utils.executeQuery(`UPDATE job_status SET status = "${_responsebody.data[jobid]}" where job_id = "${jobid}"`);
          }
        }
        this.checkLimit += 50;
      }
    } else {
      this.checkLimit = 0;
    }
  }

  @Cron('* * * * *')
  async handleCampaignCron() {
    console.log('handleCampaignCron: CRON DATE', new Date());
    const queryString = `SELECT c.id,c.utctime,c.timeZone,c.start_date,c.end_date,csv.filename,csv.totalCount,c.intervalMinute,c.lastIndex, a.filename as audio_filename FROM campaign c INNER JOIN csvfile csv ON c.csvfile_id = csv.id INNER JOIN audio a ON a.id = c.audio_id WHERE isCalling = 0 AND status = 1`;
    const campaignList: Array<any> = await Utils.executeQuery(queryString);


    campaignList && campaignList.forEach(campaign => {
      console.log("MOMENT TIME DIFF IN MIN => ", moment.utc().diff(momentTz.tz(campaign.start_date, campaign.timeZone).utc(), "minutes"));
      let runCampaign = false;
      if (campaign.start_date === "0000-00-00 00:00:00") {
        runCampaign = true;
      } else if (moment.utc().diff(momentTz.tz(campaign.start_date, campaign.timeZone).utc(), "minutes") >= 0) {
        runCampaign = true;
      }
      try {
        if (runCampaign) {
          let counter = 0;
          let numbers = [];
          fs.createReadStream('dist/public/' + campaign.filename)
            .on('error', async () => {
              console.error("FILE NOT FOUND ");
            })
            .pipe(csv())
            .on('data', data => {
              if (counter++ >= campaign.lastIndex && counter <= campaign.lastIndex + campaign.intervalMinute) {
                numbers.push(data);
              }
            })
            .on('end', async () => {
              if (numbers.length) {
                try {
                  await QueryBuilder.updateRecord('campaign', campaign.id, { isCalling: 1 });
                  const _numberWithCarriers: Record[] = [];
                  const jobQueueNumber: Record[] = []
                  for (const number of numbers) {
                    const _carrier: string = await Utils.getCarrier(number) as string;
                    _numberWithCarriers.push({
                      carrier: _carrier,
                      number: number.phone_number
                    })
                    console.log("number carrier", number, _carrier);
                  }
                  console.log("_numberwithcarries length", _numberWithCarriers.length);
                  console.log("_numberWithCarriers", _numberWithCarriers);
                  const verizonCarriers: Record[] = _numberWithCarriers.filter(x => x.carrier == 'verizon').map(y => { return { number: y.number } });
                  console.log("verizonCarriers", verizonCarriers)
                  const tmobileCarriers: Record[] = _numberWithCarriers.filter(x => x.carrier == 'tmobile').map(y => { return { number: y.number } });
                  const attCarriers: Record[] = _numberWithCarriers.filter(x => x.carrier == 'att').map(y => { return { number: y.number } });
                  // // Create DROP request for VERIZON carrier 
                  // const _verizonRequest = Utils.makeRequestForAsterisk(campaign, verizonCarriers, 'VERIZON');
                  // // Create DROP request for T-MOBILE carrier
                  // const _tmobileRequest = Utils.makeRequestForAsterisk(campaign, verizonCarriers, 'T-MOBILE');
                  // // Create DROP request for CINGULAR carrier
                  // const _attRequest = Utils.makeRequestForAsterisk(campaign, verizonCarriers, 'CINGULAR');

                  const client = await faktory.connect({ url: Constants.FaktoryUrl });

                  try {
                    // VERIZON CARRIER
                    var i, j, temporary, chunk = Constants.BatchSize;
                    for (i = 0, j = verizonCarriers.length; i < j; i += Constants.BatchSize) {
                      temporary = verizonCarriers.slice(i, i + chunk);
                      console.log("temporary jobs", JSON.stringify(temporary), "verizon", i);
                      const jobid = await client.job("OriginateCallJob", Utils.makeRequestForAsterisk(campaign, temporary, 'verizon')).push();
                      console.log('JOB ID', jobid);
                      if (jobQueueNumber.indexOf(x => x.numbers == temporary.map(x => x.number).join(',')) == -1) {
                        jobQueueNumber.push({
                          job_id: jobid,
                          numbers: temporary.map(x => x.number).join(','),
                          campaign_id: campaign.id,
                          status: "sent",
                          numberCount: temporary.length
                        })
                      }
                    }
                  } catch (ex) {

                  }

                  try {
                    // T-MOBILE
                    var i, j, temporary, chunk = Constants.BatchSize;
                    for (i = 0, j = tmobileCarriers.length; i < j; i += Constants.BatchSize) {
                      temporary = tmobileCarriers.slice(i, i + chunk);
                      const jobid = await client.job("OriginateCallJob", Utils.makeRequestForAsterisk(campaign, temporary, 'tmobile')).push();
                      console.log('JOB ID', jobid);
                      jobQueueNumber.push({
                        job_id: jobid,
                        numbers: temporary.map(x => x.number).join(','),
                        campaign_id: campaign.id,
                        status: "sent",
                        numberCount: temporary.length
                      })
                    }
                  } catch (ex) {

                  }

                  try {
                    // CINGULAR
                    var i, j, temporary, chunk = Constants.BatchSize;
                    for (i = 0, j = attCarriers.length; i < j; i += Constants.BatchSize) {
                      temporary = attCarriers.slice(i, i + chunk);
                      const jobid = await client.job("OriginateCallJob", Utils.makeRequestForAsterisk(campaign, temporary, 'att')).push();
                      console.log('JOB ID', jobid);
                      jobQueueNumber.push({
                        job_id: jobid,
                        numbers: temporary.map(x => x.number).join(','),
                        campaign_id: campaign.id,
                        status: "sent",
                        numberCount: temporary.length
                      })
                    }
                  } catch (ex) {

                  }
                  const isCallCompleted = campaign.lastIndex + campaign.intervalMinute > counter ? true : false;
                  await QueryBuilder.updateRecord('campaign', campaign.id, {
                    isCalling: 0,
                    lastIndex: campaign.lastIndex + campaign.intervalMinute,
                    status: isCallCompleted ? 0 : 1,
                  });
                  await QueryBuilder.bulkInsert('job_status', jobQueueNumber);
                  await client.close();
                }
                catch (ex) {
                  await QueryBuilder.updateRecord('campaign', campaign.id, { isCalling: 0 });
                }
              }
            })
        }
      } catch (ex) {
        console.error('Exception => ', ex.message);
      }
    });
  }
}
