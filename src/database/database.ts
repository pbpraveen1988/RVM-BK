import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export class Connections {
    public static postgres: TypeOrmModuleOptions = {
        type: 'mysql',
        port: 3306,
        username: 'admin',
        password: 'danialdanish',
        database: 'rvm-danial',
        host: 'rvm-danial.c7rknp0qzqv8.us-east-2.rds.amazonaws.com',
        synchronize: true,
        entities: []
    };
    // public static postgres: TypeOrmModuleOptions = {
    //     type: 'mysql',
    //     port: 3306,
    //     username: 'root',
    //     password: '123456',
    //     database: 'rvm-danial',
    //     host: 'localhost',
    //     synchronize: true,
    //     entities: []
    // };
}