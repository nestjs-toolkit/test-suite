import { Body, Controller, Post } from '@nestjs/common';
import { BadRequestException } from '@nestjs-toolkit/base/exceptions';

type SumDto = {
  a: number;
  b: number;
};

@Controller('calc')
export class CalcController {
  @Post('sum')
  sum(@Body() { a, b }: SumDto) {
    if (!a || !b)
      throw new BadRequestException('a and b are required', 'CALC_VALIDATION');

    return { result: a + b };
  }
}
