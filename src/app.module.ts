import { Module } from '@nestjs/common';
import { InfraestructureModule } from './infraestructure/infraestructure.module';
import { UserInterfaceModule } from './user-interface/user-interface.module';

@Module({
  imports: [
    InfraestructureModule,
		UserInterfaceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
