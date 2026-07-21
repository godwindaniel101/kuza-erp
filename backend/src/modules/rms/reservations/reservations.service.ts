import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Business } from '../../../common/entities/business.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';
import { UpdateReservationDto, UpdateStatusDto } from './dto/update-reservation.dto';

interface ActingUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly notifications: NotificationsService,
  ) {}

  private notPast(iso: string): Date {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) {
      throw new BadRequestException('Invalid reservation date/time');
    }
    // small tolerance for clock skew (5 min)
    if (at.getTime() < Date.now() - 5 * 60 * 1000) {
      throw new BadRequestException('Reservation time is in the past');
    }
    return at;
  }

  async create(dto: CreateReservationDto, user?: ActingUser): Promise<Reservation> {
    const reservationAt = this.notPast(dto.reservationAt);
    const actorName =
      user?.name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      null;

    const reservation = this.reservationRepository.create({
      branchId: dto.branchId || null,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone || null,
      customerEmail: dto.customerEmail || null,
      partySize: dto.partySize,
      reservationAt,
      durationMins: dto.durationMins || 90,
      status: 'confirmed', // staff-created bookings are confirmed
      tableLabel: dto.tableLabel || null,
      notes: dto.notes || null,
      source: 'staff',
      createdBy: user?.id || null,
      createdByName: actorName,
    });
    const saved = await this.reservationRepository.save(reservation);
    void this.emailGuest(saved, 'confirmed');
    return saved;
  }

  async createPublic(dto: CreatePublicReservationDto): Promise<{ id: string; status: ReservationStatus }> {
    const reservationAt = this.notPast(dto.reservationAt);
    const reservation = this.reservationRepository.create({
      branchId: null,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail || null,
      partySize: dto.partySize,
      reservationAt,
      durationMins: 90,
      status: 'pending', // guest requests await staff confirmation
      notes: dto.notes || null,
      source: 'online',
    });
    const saved = await this.reservationRepository.save(reservation);
    void this.emailGuest(saved, 'pending');
    return { id: saved.id, status: saved.status };
  }

  async findAll(query: {
    from?: string;
    to?: string;
    status?: string;
    branchId?: string;
  }): Promise<Reservation[]> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.from && query.to) {
      where.reservationAt = Between(new Date(query.from), new Date(query.to));
    }
    return this.reservationRepository.find({
      where,
      order: { reservationAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async update(id: string, dto: UpdateReservationDto): Promise<Reservation> {
    const reservation = await this.findOne(id);
    if (dto.reservationAt) reservation.reservationAt = this.notPast(dto.reservationAt);
    if (dto.customerName !== undefined) reservation.customerName = dto.customerName;
    if (dto.customerPhone !== undefined) reservation.customerPhone = dto.customerPhone || null;
    if (dto.customerEmail !== undefined) reservation.customerEmail = dto.customerEmail || null;
    if (dto.partySize !== undefined) reservation.partySize = dto.partySize;
    if (dto.durationMins !== undefined) reservation.durationMins = dto.durationMins;
    if (dto.branchId !== undefined) reservation.branchId = dto.branchId || null;
    if (dto.tableLabel !== undefined) reservation.tableLabel = dto.tableLabel || null;
    if (dto.notes !== undefined) reservation.notes = dto.notes || null;
    if (dto.status !== undefined) reservation.status = dto.status as ReservationStatus;
    return this.reservationRepository.save(reservation);
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<Reservation> {
    const reservation = await this.findOne(id);
    const prev = reservation.status;
    reservation.status = dto.status as ReservationStatus;
    if (dto.tableLabel !== undefined) reservation.tableLabel = dto.tableLabel || null;
    const saved = await this.reservationRepository.save(reservation);
    // Notify the guest when a pending request becomes confirmed.
    if (prev !== 'confirmed' && saved.status === 'confirmed') {
      void this.emailGuest(saved, 'confirmed');
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.reservationRepository.delete({ id });
  }

  // ---- email --------------------------------------------------------------

  private async venueName(): Promise<string> {
    try {
      const biz = (await this.businessRepository.find({ take: 1 }))[0];
      return biz?.name || 'our restaurant';
    } catch {
      return 'our restaurant';
    }
  }

  private async emailGuest(
    reservation: Reservation,
    kind: 'confirmed' | 'pending',
  ): Promise<void> {
    if (!reservation.customerEmail) return;
    const venueName = await this.venueName();
    const dateTime = new Date(reservation.reservationAt).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    await this.notifications.sendEmail({
      to: reservation.customerEmail,
      subject:
        kind === 'confirmed'
          ? `Reservation confirmed — ${venueName}`
          : `Reservation request received — ${venueName}`,
      template: 'reservation-confirmation',
      context: {
        venueName,
        customerName: reservation.customerName,
        statusLabel: kind === 'confirmed' ? 'Confirmed' : 'Requested',
        intro:
          kind === 'confirmed'
            ? `Your table is booked. We look forward to seeing you at ${venueName}.`
            : `We've received your request and will confirm shortly.`,
        dateTime,
        partySize: reservation.partySize,
        tableLabel: reservation.tableLabel || '',
        notes: reservation.notes || '',
        reference: reservation.id.slice(0, 8).toUpperCase(),
      },
    });
  }
}
