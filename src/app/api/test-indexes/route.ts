import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withAnalyticsAuth } from "../analytics/middleware";

export async function POST(request: NextRequest) {
  return withAnalyticsAuth(request, async (user, req) => {
    try {
      await connectToDatabase();
      
      // Get the database connection
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      if (!db) {
        return NextResponse.json({ 
          success: false, 
          error: "Database connection not available" 
        });
      }

      // Essential indexes for analytics performance
      const indexes = [
        {
          collection: 'candidates',
          index: { organizationId: 1, 'tracking.createdAt': 1, isDeleted: 1 },
          name: 'analytics_candidates_org_created_deleted'
        },
        {
          collection: 'candidates', 
          index: { organizationId: 1, status: 1, jobId: 1, isDeleted: 1 },
          name: 'analytics_candidates_org_status_job_deleted'
        },
        {
          collection: 'candidates',
          index: { 'assignment.interviewerId': 1, organizationId: 1 },
          name: 'analytics_candidates_interviewer_org'
        },
        {
          collection: 'jobs',
          index: { organizationId: 1, 'tracking.createdAt': 1, isDeleted: 1 },
          name: 'analytics_jobs_org_created_deleted'
        },
        {
          collection: 'jobs',
          index: { organizationId: 1, status: 1, isPublished: 1, isDeleted: 1 },
          name: 'analytics_jobs_org_status_published_deleted'
        }
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
          const indexExists = existingIndexes.some((idx: any) => idx.name === indexDef.name);
          
          if (indexExists) {
            results.push({
              collection: indexDef.collection,
              name: indexDef.name,
              status: 'already_exists'
            });
            existing++;
            continue;
          }
          
          // Create index
          await collection.createIndex(indexDef.index, { 
            name: indexDef.name, 
            background: true 
          });
          
          results.push({
            collection: indexDef.collection,
            name: indexDef.name,
            status: 'created'
          });
          created++;
          
        } catch (error: any) {
          results.push({
            collection: indexDef.collection,
            name: indexDef.name,
            status: 'failed',
            error: error.message
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
          total: indexes.length
        },
        results
      });
      
    } catch (error:any) {
      console.error("Index creation error:", error);
      return NextResponse.json({
        success: false,
        error: "Failed to create indexes",
        details: error.message
      }, { status: 500 });
    }
  });
}

export async function GET(request: NextRequest) {
  return withAnalyticsAuth(request, async (user, req) => {
    try {
      await connectToDatabase();
      
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      if (!db) {
        return NextResponse.json({ 
          success: false, 
          error: "Database connection not available" 
        });
      }

      // Check existing indexes
      const collections = ['candidates', 'jobs', 'users'];
      const indexInfo = [];
      
      for (const collectionName of collections) {
        try {
          const collection = db.collection(collectionName);
          const indexes = await collection.indexes();
          const analyticsIndexes = indexes.filter((idx: any) => 
            idx.name && idx.name.startsWith('analytics_')
          );
          
          indexInfo.push({
            collection: collectionName,
            totalIndexes: indexes.length,
            analyticsIndexes: analyticsIndexes.map((idx: any) => ({
              name: idx.name,
              keys: idx.key
            }))
          });
        } catch (error:any) {
          indexInfo.push({
            collection: collectionName,
            error: error.message
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        indexInfo
      });
      
    } catch (error:any) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
  });
}