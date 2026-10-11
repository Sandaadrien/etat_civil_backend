import { IsBoolean } from 'class-validator';

export class UpdateAgentStatusDto {
  @IsBoolean()
  is_active!: boolean;
}
