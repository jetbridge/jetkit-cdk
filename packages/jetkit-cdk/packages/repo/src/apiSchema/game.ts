import { IsString } from "class-validator";

export class GameSchemaLite { 
    @IsString()
    name: string
}