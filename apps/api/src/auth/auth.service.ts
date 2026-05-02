import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const slug = dto.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization name already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const org = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
        slug,
        users: {
          create: {
            email: dto.email.toLowerCase(),
            passwordHash,
            name: dto.name,
            phone: dto.phone,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const user = org.users[0];
    const token = this.signToken(user.id, user.email, org.id, user.role);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: org.id,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.signToken(
      user.id,
      user.email,
      user.organizationId,
      user.role,
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    return user;
  }

  private signToken(
    userId: string,
    email: string,
    organizationId: string,
    role: string,
  ): string {
    return this.jwt.sign({
      sub: userId,
      email,
      organizationId,
      role,
    });
  }
}
