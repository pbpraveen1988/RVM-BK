import { getConnection } from "typeorm";
import { HttpException, HttpStatus } from "@nestjs/common";
import { Constants } from './constants';
import { Record } from "../model";

export const API_TCPA_SCRUB_BULK = 'https://api.tcpalitigatorlist.com/scrub/phones';
export const API_TCPA_SCRUB_STATUS = 'https://api.tcpalitigatorlist.com/scrub/phones/get';
export const TCPA_USERNAME = 'tcpa_BKjMrl8NgZ';
export const TCPA_SECRET = 'AK6g aNnK ivXC nqAn aAhl TFvv';

export class Utils {

    public static async executeQuery<T>(queryString: string): Promise<T> {
        return await getConnection().query(queryString)
            .then((response: any) => {
                console.log(response);
                return this.newResolvedPromise(response);
            }).catch(error => {
                console.error(error);
                if (error.code == 'ER_NO_SUCH_TABLE') {
                    throw new HttpException('Bad Request, Object Not Found', HttpStatus.BAD_REQUEST);
                } else if (error.code == 'ER_BAD_FIELD_ERROR') {
                    throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
                } else if (error.code == 'ER_DUP_ENTRY') {
                    throw new HttpException(error.message, HttpStatus.CONFLICT);
                } else if (error.code == 'ER_WRONG_VALUE') {
                    throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
                } else {
                    throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
                }
            })
    }

    public static newResolvedPromise<T>(value: T): Promise<T> {
        return new Promise((resolve, reject) => resolve(value));
    }

    public static newRejectPromise<T>(value: T): Promise<T> {
        return new Promise((resolve, reject) => reject(value));
    }

    /**
     * 
     * @param phone_number 
     * @returns Will return the carrier of the phone number.
     */
    // NOTE :  Later we will make api call or DB call to get the carrier
    public static async getCarrier(phone_number: string | number) {
        return new Promise((resolve, reject) => resolve('verizon'));
    }

    public static async getLines(carrier?: string) {
        let sqlQuery = 'SELECT * FROM xreflines where inUse = 0 ';
        if (carrier) {
            sqlQuery += ' AND carrier = ' + carrier;
        }
        const campaignList: Array<any> = await Utils.executeQuery(sqlQuery);
        if (campaignList && campaignList.length) {
            return campaignList;
        }
        return;
    }

    public static makeRequestForAsterisk(campaign: Record, numbersArray: Record[], carrier: string, lines?: { xref: string, phone: string }) {
        const _record: Record = new Record();
        _record["vm_numbers"] = numbersArray;
        _record["carrier"] = carrier;
        _record["telco_carrier"] = "telnyx";
        _record["audio_uri"] = Constants.AudioUrl + '/' + campaign.audio_filename;
        // _record["callback_url"] = Constants.CallBackUrl;
        if (lines) {
            _record["mailbox_number"] = lines.phone;
            _record["gateway_access_number"] = lines.xref;
            _record["telco_caller_id"] = lines.phone;
            switch (carrier) {
                case 'VERIZON':
                    _record["mailbox_password"] = "7079"; break;
                case 'T-MOBILE':
                    _record["mailbox_password"] = "7079"; break;
                case 'CINGULAR':
                    _record["mailbox_password"] = "7079"; break;
            }
        }
        return _record;
    }

}