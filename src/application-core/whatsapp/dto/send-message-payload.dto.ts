import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendMessagePayloadDTO {
    @ApiProperty({ example: '999999999' })
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @ApiProperty({ example: 'https://example.com/document.pdf' })
    @IsNotEmpty()
    pdfUrl: string;

    @ApiProperty({ example: 'Aquí tienes tu documento.' })
    @IsString()
    @IsOptional()
    message?: string;

    @ApiProperty({ example: 'Aquí tienes tu documento.' })
    @IsString()
    @IsNotEmpty()
    caption: string;

    @ApiProperty({ example: 'documento.pdf' })
    @IsString()
    @IsNotEmpty()
    filename: string;
}