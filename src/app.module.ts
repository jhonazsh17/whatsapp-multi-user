import { Module } from '@nestjs/common';
import { InfraestructureModule } from './infraestructure/infraestructure.module';
import { UserInterfaceModule } from './user-interface/user-interface.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    InfraestructureModule,
    UserInterfaceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
