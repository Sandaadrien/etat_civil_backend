import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { CreateEnrolmentDto } from './dto/create-enrolment.dto';
import { EnrolmentService } from './enrolment.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    sub?: string;
  };
};

@ApiTags('Enrolments')
@ApiBearerAuth()
@Controller('enrolments')
export class EnrolmentController {
  constructor(private readonly enrolmentService: EnrolmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new enrolment',
  })
  async create(
    @Body() dto: CreateEnrolmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id ?? req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.enrolmentService.create(dto, userId);
  }
}
