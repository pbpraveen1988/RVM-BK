import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from '../services';

@Controller('identity/v1.0')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('register')
  async register(@Body() request): Promise<any> {
    return this.userService.register(request);
  }

  @Post('signin')
  async signin(@Body() request): Promise<any> {
    return this.userService.signIn(request);
  }
}
