import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from './entities/user.entity';

/**
 * This User module is for testing only and will not be published in the library.
 * TODO: Replace this with your actual User controller implementation.
 */
@ApiTags('Users (Testing Only)')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (for testing only)' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.userService.findById(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Create dummy user for testing' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: User,
  })
  async seedUser(): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.userService.findById(1);
      return existingUser;
    } catch (error) {
      // Create dummy user
      return this.userService.create({
        id: 1,
        email: 'younus@geeksofkolachi.com',
        fullName: 'Younus Test User',
        stripeCustomerId: 'cus_TJkuRKVnUJrm5d',
      });
    }
  }
}
