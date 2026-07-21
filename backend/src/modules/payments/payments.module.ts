import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';
import { MonnifyProvider } from './providers/monnify.provider';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentSettlement } from './entities/payment-settlement.entity';
import { TwoFactor } from './entities/two-factor.entity';
import { Branch } from '../../common/entities/branch.entity';
import { Business } from '../../common/entities/business.entity';
import { Order } from '../rms/entities/order.entity';
import { OrderPayment } from '../rms/entities/order-payment.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PaymentMethod,
      PaymentAccount,
      PaymentTransaction,
      PaymentSettlement,
      TwoFactor,
      Branch,
      Business,
      Order,
      OrderPayment,
    ]),
  ],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService, MonnifyProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
