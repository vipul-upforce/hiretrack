import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';
import { withAnalyticsAuth } from '../analytics/middleware';

export async function POST(request: NextRequest) {
  return withAnalyticsAuth(request, async (_user, _req) => {
    try {
      await connectToDatabase();

      // Get the database connection
      const mongoose = require('mongoose');
      const { db } = mongoose.connection;

      if (!db) {
        return NextResponse.json({
          success: false,
          error: 'Database connection not available',
        });
      }

      // Essential indexes for analytics performance
      const indexes = [
        {
          collection: 'candidates',
          index: { organizationId: 1, 'tracking.createdAt': 1, isDeleted: 1 },
          name: 'analytics_candidates_org_created_deleted',
        },
        {
          collection: 'candidates',
          index: {
            organizationId: 1,
            status: 1,
            jobId: 1,
            isDeleted: 1,
          },
          name: 'analytics_candidates_org_status_job_deleted',
        },
        {
          collection: 'candidates',
          index: { 'assignment.interviewerId': 1, organizationId: 1 },
          name: 'analytics_candidates_interviewer_org',
        },
        {
          collection: 'jobs',
          index: { organizationId: 1, 'tracking.createdAt': 1, isDeleted: 1 },
          name: 'analytics_jobs_org_created_deleted',
        },
        {
          collection: 'jobs',
          index: {
            organizationId: 1,
            status: 1,
            isPublished: 1,
            isDeleted: 1,
          },
          name: 'analytics_jobs_org_status_published_deleted',
        },
      ];

      const results = [];
      let created = 0;
      let existing = 0;
      let failed = 0;

      for (const indexDef of indexes) {
        try {
          const collection = db.collection(indexDef.collection);

          // Check if index exists
          const existingIndexes = await collection.indexes();
          const indexExists = existingIndexes.some(
            (idx: any) => idx.name === indexDef.name,
          );

          if (indexExists) {
            results.push({
              collection: indexDef.collection,
              name: indexDef.name,
              status: 'already_exists',
            });
            existing++;
            continue;
          }

          // Create index
          await collection.createIndex(indexDef.index, {
            name: indexDef.name,
            background: true,
          });

          results.push({
            collection: indexDef.collection,
            name: indexDef.name,
            status: 'created',
          });
          created++;
        } catch (error: unknown) {
          results.push({
            collection: indexDef.collection,
            name: indexDef.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          failed++;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Analytics indexes creation completed',
        summary: {
          created,
          existing,
          failed,
          total: indexes.length,
        },
        results,
      });
    } catch (error: unknown) {
      logger.error({ error, url: request.url }, 'Index creation error.');
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create indexes',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withAnalyticsAuth(request, async (_user, _req) => {
    try {
      await connectToDatabase();

      const mongoose = require('mongoose');
      const { db } = mongoose.connection;

      if (!db) {
        return NextResponse.json({
          success: false,
          error: 'Database connection not available',
        });
      }

      // Check existing indexes
      const collections = ['candidates', 'jobs', 'users'];
      const indexInfo = [];

      for (const collectionName of collections) {
        try {
          const collection = db.collection(collectionName);
          const indexes = await collection.indexes();
          const analyticsIndexes = indexes.filter(
            (idx: any) => idx.name && idx.name.startsWith('analytics_'),
          );

          indexInfo.push({
            collection: collectionName,
            totalIndexes: indexes.length,
            analyticsIndexes: analyticsIndexes.map((idx: any) => ({
              name: idx.name,
              keys: idx.key,
            })),
          });
        } catch (error: unknown) {
          indexInfo.push({
            collection: collectionName,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        success: true,
        indexInfo,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  });
}
