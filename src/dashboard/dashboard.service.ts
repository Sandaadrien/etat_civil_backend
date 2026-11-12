import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma';

import {
  DashboardResponse,
  RecentEnrolment,
} from './dto/dashboard-response.dto';

import { sync_status } from 'generated/prisma/enums';

@Injectable()
export class DashboardService {
  async getDashboard(agentId: string): Promise<DashboardResponse> {
    // Début et fin de la journée locale
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Nombre de dossiers créés aujourd'hui
    const dossiersToday = await prisma.enrolment.count({
      where: {
        agent_id: agentId,
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // 2. Nombre de dossiers en cours
    const inProgress = await prisma.enrolment.count({
      where: {
        agent_id: agentId,
        sync_status: {
          in: [sync_status.PENDING, sync_status.FAILED],
        },
      },
    });

    // 3. Nombre de dossiers soumis au registre
    const submittedToRegistry = await prisma.enrolment.count({
      where: {
        agent_id: agentId,
        sync_status: sync_status.SYNCED,
      },
    });

    // 4. Nombre de dossiers en attente de synchronisation
    const pendingSync = await prisma.enrolment.count({
      where: {
        agent_id: agentId,
        sync_status: sync_status.PENDING,
      },
    });

    // 5. Récupérer les 5 dossiers récents
    const recent = await prisma.enrolment.findMany({
      where: {
        agent_id: agentId,
      },
      take: 5,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        application_id: true,
        created_at: true,
        sync_status: true,

        citizen: {
          select: {
            person: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    // 6. Transformer les dossiers pour le frontend
    const recentEnrolments: RecentEnrolment[] = recent.map((enrolment) => {
      const person = enrolment.citizen.person;

      let status: RecentEnrolment['status'];
      let step: string;

      switch (enrolment.sync_status) {
        case sync_status.SYNCED:
          status = 'Validé';
          step = 'Soumis au registre';
          break;

        case sync_status.FAILED:
          status = 'Échec';
          step = 'Échec de synchronisation';
          break;

        case sync_status.PENDING:
        default:
          status = 'En attente';
          step = 'En attente de synchronisation';
          break;
      }

      return {
        id: enrolment.id,
        reference: enrolment.application_id,
        applicant: [person.last_name, person.first_name]
          .filter(Boolean)
          .join(' '),

        step,
        status,
        createdAt: enrolment.created_at,
      };
    });

    // 7. Retourner le dashboard
    return {
      stats: {
        dossiersToday,
        inProgress,
        submittedToRegistry,
        pendingSync,
      },

      recentEnrolments,
    };
  }
}
