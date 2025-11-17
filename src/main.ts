import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UserService } from './modules/user/user.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Create dummy user for testing
  const userService = app.get(UserService);
  try {
    const existingUser = await userService.findByEmail(
      'younus@geeksofkolachi.com',
    );
    if (existingUser) {
      console.log('User already exists');
    }
  } catch (error) {
    // User doesn't exist, create it
    const dummyUser = await userService.create({
      email: 'younus@geeksofkolachi.com',
      fullName: 'Younus Test User',
      stripeCustomerId: 'cus_TJkuRKVnUJrm5d',
      paypalPayerId: '5O190127TN364715T',
    });
    console.log('Dummy user created:', dummyUser);
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 3000}`,
  );
}
bootstrap();
