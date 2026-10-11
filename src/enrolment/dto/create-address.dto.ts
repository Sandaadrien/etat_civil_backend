import { IsEnum, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { occupancy_type } from 'generated/prisma/enums';

export class CreateAddressDto {
  @ApiProperty({ example: '12B' })
  @IsString()
  house_number!: string;

  @ApiProperty({ example: '937a9566-f922-4761-aa7f-945b530336e2' })
  @IsUUID()
  fokontany_id!: string;

  @ApiProperty({
    enum: occupancy_type,
    example: occupancy_type.OWNER,
  })
  @IsEnum(occupancy_type)
  occupancy_type!: occupancy_type;
}
