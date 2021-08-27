import { getConnection } from "typeorm";
import { HttpException, HttpStatus } from "@nestjs/common";

export class Utils {

    public static async executeQuery<T>(queryString: string): Promise<T> {
        return await getConnection().query(queryString)
            .then((response: any) => {
                return this.newResolvedPromise(response);
            }).catch(error => {
                console.error(error);
                if (error.code == 'ER_NO_SUCH_TABLE') {
                    throw new HttpException('Bad Request, Object Not Found', HttpStatus.BAD_REQUEST);
                } else if (error.code == 'ER_BAD_FIELD_ERROR') {
                    throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
                }
            })
    }

    public static newResolvedPromise<T>(value: T): Promise<T> {
        return new Promise((resolve, reject) => resolve(value));
    }

    public static newRejectPromise<T>(value: T): Promise<T> {
        return new Promise((resolve, reject) => reject(value));
    }

}