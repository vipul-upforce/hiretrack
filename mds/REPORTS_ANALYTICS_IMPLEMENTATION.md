# HireTrack Reports & Analytics Implementation Plan

## 📋 Project Overview

**Project**: HireTrack Reports & Analytics Section
**Phases**: Phase 1 (High Impact) + Phase 2 (Medium Impact)
**Timeline**: 6-8 weeks
**Team**: Frontend + Backend + Database
**Priority**: High

---

## 🎯 **PHASE 1: HIGH IMPACT REPORTS (Weeks 1-4)**

### **1.1 Candidate Funnel Report**

#### **Task 1.1.1: Backend API Development**

- [ ] **Status**: Pending
- [ ] **Priority**: Critical
- [ ] **Estimated Time**: 2 days
- [ ] **Dependencies**: None

**Implementation Details:**

```typescript
// API Endpoint: GET /api/analytics/candidate-funnel
// Data Source: Candidate collection with status tracking
// Aggregation Pipeline:
[
  { $match: { organizationId: ObjectId(orgId) } },
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      avgTimeInStage: {
        $avg: { $subtract: ["$tracking.updatedAt", "$tracking.createdAt"] },
      },
    },
  },
  { $sort: { _id: 1 } },
];
```

**Charts to Implement:**

1. **Funnel Chart**: Visual representation of candidate flow through stages
2. **Bar Chart**: Candidate count per stage with conversion rates
3. **Line Chart**: Time-in-stage trends over time
4. **Pie Chart**: Distribution of candidates across stages

#### **Task 1.1.2: Frontend Dashboard Component**

- [ ] **Status**: Pending
- [ ] **Priority**: Critical
- [ ] **Estimated Time**: 3 days
- [ ] **Dependencies**: Task 1.1.1

**Component Structure:**

```typescript
interface FunnelData {
  stage: string;
  count: number;
  conversionRate: number;
  avgTimeInDays: number;
  previousStageCount: number;
}

// Charts: Recharts or Chart.js
// - FunnelChart for stage progression
// - BarChart for stage counts
// - LineChart for time trends
// - PieChart for distribution
```

#### **Task 1.1.3: Data Export & Filtering**

- [ ] **Status**: Pending
- [ ] **Priority**: Medium
- [ ] **Estimated Time**: 1 day
- [ ] **Dependencies**: Task 1.1.2

**Features:**

- Date range filtering
- Job-specific filtering
- Export to CSV/PDF
- Real-time data refresh

---

### **1.2 Job Performance Analytics**

#### **Task 1.2.1: Backend API Development**

- [ ] **Status**: Pending
- [ ] **Priority**: Critical
- [ ] **Estimated Time**: 2 days
- [ ] **Dependencies**: None

**Implementation Details:**

```typescript
// API Endpoint: GET /api/analytics/job-performance
// Data Source: Job + Candidate collections
// Aggregation Pipeline:
[
  { $match: { organizationId: ObjectId(orgId) } },
  {
    $lookup: {
      from: "candidates",
      localField: "_id",
      foreignField: "jobId",
      as: "candidates",
    },
  },
  {
    $addFields: {
      candidateCount: { $size: "$candidates" },
      acceptedCount: {
        $size: {
          $filter: {
            input: "$candidates",
            cond: { $eq: ["$$this.status", "accepted"] },
          },
        },
      },
      avgTimeToFill: { $avg: "$candidates.tracking.createdAt" },
    },
  },
  {
    $project: {
      title: 1,
      status: 1,
      candidateCount: 1,
      acceptedCount: 1,
      avgTimeToFill: 1,
    },
  },
];
```

**Charts to Implement:**

1. **Scatter Plot**: Applications vs Time-to-Fill
2. **Bar Chart**: Top performing jobs by application count
3. **Heat Map**: Job performance by department/role
4. **Gauge Chart**: Job posting effectiveness score

#### **Task 1.2.2: Frontend Dashboard Component**

- [ ] **Status**: Pending
- [ ] **Priority**: Critical
- [ ] **Estimated Time**: 3 days
- [ ] **Dependencies**: Task 1.2.1

**Component Features:**

- Job performance comparison
- Success rate calculations
- Time-to-fill analysis
- Application volume trends

#### **Task 1.2.3: Job Source Analysis**

- [ ] **Status**: Pending
- [ ] **Priority**: Medium
- [ ] **Estimated Time**: 1 day
- [ ] **Dependencies**: Task 1.2.2

**Features:**

- Source tracking (job boards, referrals, direct)
- Source effectiveness metrics
- Cost per source analysis

---

### **1.3 Interview Assignment Analytics**

#### **Task 1.3.1: Backend API Development**

- [ ] **Status**: Pending
- [ ] **Priority**: Critical
- [ ] **Estimated Time**: 2 days
- [ ] **Dependencies**: None

**Implementation Details:**

```typescript
// API Endpoint: GET /api/analytics/interview-assignments
// Data Source: Candidate + User collections
// Aggregation Pipeline:
[
  { $match: { "assignment.interviewerId": { $exists: true } } },
  {
    $group: {
      _id: "$assignment.interviewerId",
      totalAssignments: { $sum: 1 },
      completedInterviews: {
        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
      },
      avgRating: { $avg: "$scores.overall" },
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "interviewer",
    },
  },
  { $unwind: "$interviewer" },
];
```

**Charts to Implement:**

1. **Bar Chart**: Interviewer workload distribution
2. **Radar Chart**: Interviewer performance metrics
3. **Timeline Chart**: Interview scheduling patterns
4. **Donut Chart**: Assignment completion rates

#### **Task 1.3.2: Frontend Dashboard Component**

- [ ] **Status**: Pending
- [ ] **Priority**: Critical
- [ ] **Estimated Time**: 3 days
- [ ] **Dependencies**: Task 1.3.1

**Component Features:**

- Interviewer performance comparison
- Workload balancing analysis
- Interview scheduling efficiency
- Completion rate tracking

#### **Task 1.3.3: Interviewer Performance Metrics**

- [ ] **Status**: Pending
- [ ] **Priority**: Medium
- [ ] **Estimated Time**: 1 day
- [ ] **Dependencies**: Task 1.3.2

**Features:**

- Success rate per interviewer
- Average candidate scores
- Interview duration analysis
- Feedback quality metrics

---

### **1.4 Time-based Application Trends**

#### **Task 1.4.1: Backend API Development**

- [ ] **Status**: Pending
- [ ] **Priority**: Critical
- [ ] **Estimated Time**: 2 days
- [ ] **Dependencies**: None

**Implementation Details:**

```typescript
// API Endpoint: GET /api/analytics/application-trends
// Data Source: Candidate tracking data
// Aggregation Pipeline:
[
  { $match: { organizationId: ObjectId(orgId) } },
  {
    $group: {
      _id: {
        year: { $year: "$tracking.createdAt" },
        month: { $month: "$tracking.createdAt" },
        day: { $dayOfMonth: "$tracking.createdAt" },
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
];
```

**Charts to Implement:**

1. **Line Chart**: Daily application trends
2. **Area Chart**: Weekly/monthly application volumes
3. **Heat Map**: Application patterns by day/hour
4. **Bar Chart**: Peak application periods

#### **Task 1.4.2: Frontend Dashboard Component**

- [ ] **Status**: Pending
- [ ] **Priority**: Critical
- [ ] **Estimated Time**: 3 days
- [ ] **Dependencies**: Task 1.4.1

**Component Features:**

- Real-time trend visualization
- Seasonal pattern analysis
- Peak time identification
- Growth rate calculations

#### **Task 1.4.3: Trend Analysis Features**

- [ ] **Status**: Pending
- [ ] **Priority**: Medium
- [ ] **Estimated Time**: 1 day
- [ ] **Dependencies**: Task 1.4.2

**Features:**

- Trend prediction algorithms
- Anomaly detection
- Seasonal adjustment
- Growth forecasting

---

## 🎯 **PHASE 2: MEDIUM IMPACT REPORTS (Weeks 5-8)**

### **2.1 AI Score Distribution Analytics**

#### **Task 2.1.1: Backend API Development**

- [ ] **Status**: Pending
- [ ] **Priority**: High
- [ ] **Estimated Time**: 2 days
- [ ] **Dependencies**: None

**Implementation Details:**

```typescript
// API Endpoint: GET /api/analytics/ai-scores
// Data Source: Candidate scores data
// Aggregation Pipeline:
[
  { $match: { "scores.overall": { $exists: true } } },
  {
    $group: {
      _id: null,
      avgOverall: { $avg: "$scores.overall" },
      avgExperience: { $avg: "$scores.experience" },
      avgSkills: { $avg: "$scores.skills" },
      avgAffordability: { $avg: "$scores.affordability" },
      scoreDistribution: {
        $push: {
          overall: "$scores.overall",
          experience: "$scores.experience",
          skills: "$scores.skills",
          affordability: "$scores.affordability",
        },
      },
    },
  },
];
```

**Charts to Implement:**

1. **Histogram**: Score distribution across all dimensions
2. **Box Plot**: Score quartiles and outliers
3. **Scatter Plot**: Experience vs Skills correlation
4. **Violin Plot**: Score density distribution

#### **Task 2.1.2: Frontend Dashboard Component**

- [ ] **Status**: Pending
- [ ] **Priority**: High
- [ ] **Estimated Time**: 3 days
- [ ] **Dependencies**: Task 2.1.1

**Component Features:**

- Score distribution analysis
- Correlation analysis
- Outlier detection
- Score trend analysis

#### **Task 2.1.3: Score Correlation Analysis**

- [ ] **Status**: Pending
- [ ] **Priority**: Medium
- [ ] **Estimated Time**: 1 day
- [ ] **Dependencies**: Task 2.1.2

**Features:**

- Score correlation matrix
- Predictive score modeling
- Score improvement tracking
- Benchmark analysis

---

### **2.2 Geographic Analytics**

#### **Task 2.2.1: Backend API Development**

- [ ] **Status**: Pending
- [ ] **Priority**: High
- [ ] **Estimated Time**: 2 days
- [ ] **Dependencies**: None

**Implementation Details:**

```typescript
// API Endpoint: GET /api/analytics/geographic
// Data Source: Candidate location data
// Aggregation Pipeline:
[
  { $match: { location: { $exists: true, $ne: "" } } },
  {
    $group: {
      _id: "$location",
      count: { $sum: 1 },
      avgExperience: { $avg: "$experience" },
      avgExpectedCTC: { $avg: "$expectedCTC" },
      statusDistribution: { $push: "$status" },
    },
  },
  { $sort: { count: -1 } },
];
```

**Charts to Implement:**

1. **Choropleth Map**: Candidate density by location
2. **Bar Chart**: Top candidate locations
3. **Bubble Chart**: Location vs Experience vs Salary
4. **Treemap**: Location-based candidate distribution

#### **Task 2.2.2: Frontend Dashboard Component**

- [ ] **Status**: Pending
- [ ] **Priority**: High
- [ ] **Estimated Time**: 3 days
- [ ] **Dependencies**: Task 2.2.1

**Component Features:**

- Interactive map visualization
- Location-based filtering
- Geographic trend analysis
- Remote vs on-site analysis

#### **Task 2.2.3: Geographic Insights**

- [ ] **Status**: Pending
- [ ] **Priority**: Medium
- [ ] **Estimated Time**: 1 day
- [ ] **Dependencies**: Task 2.2.2

**Features:**

- Location-based salary analysis
- Geographic hiring patterns
- Remote work preferences
- Location diversity metrics

---

### **2.3 User Activity Reports**

#### **Task 2.3.1: Backend API Development**

- [ ] **Status**: Pending
- [ ] **Priority**: High
- [ ] **Estimated Time**: 2 days
- [ ] **Dependencies**: None

**Implementation Details:**

```typescript
// API Endpoint: GET /api/analytics/user-activity
// Data Source: User login and action data
// Aggregation Pipeline:
[
  { $match: { organizationId: ObjectId(orgId) } },
  {
    $group: {
      _id: "$_id",
      name: { $first: "$name" },
      role: { $first: "$role" },
      lastLogin: { $max: "$updatedAt" },
      totalActions: { $sum: 1 },
    },
  },
  { $sort: { totalActions: -1 } },
];
```

**Charts to Implement:**

1. **Activity Timeline**: User activity over time
2. **Heat Map**: User activity by day/hour
3. **Bar Chart**: Most active users
4. **Pie Chart**: Activity distribution by role

#### **Task 2.3.2: Frontend Dashboard Component**

- [ ] **Status**: Pending
- [ ] **Priority**: High
- [ ] **Estimated Time**: 3 days
- [ ] **Dependencies**: Task 2.3.1

**Component Features:**

- User activity tracking
- Role-based activity analysis
- Login pattern analysis
- Feature usage tracking

#### **Task 2.3.3: Activity Insights**

- [ ] **Status**: Pending
- [ ] **Priority**: Medium
- [ ] **Estimated Time**: 1 day
- [ ] **Dependencies**: Task 2.3.2

**Features:**

- User engagement metrics
- Feature adoption rates
- Productivity analysis
- Training needs identification

---

### **2.4 Custom Field Usage Analytics**

#### **Task 2.4.1: Backend API Development**

- [ ] **Status**: Pending
- [ ] **Priority**: High
- [ ] **Estimated Time**: 2 days
- [ ] **Dependencies**: None

**Implementation Details:**

```typescript
// API Endpoint: GET /api/analytics/custom-fields
// Data Source: Candidate customFields data
// Aggregation Pipeline:
[
  { $match: { customFields: { $exists: true } } },
  { $project: { customFields: 1 } },
  { $addFields: { fieldNames: { $objectToArray: "$customFields" } } },
  { $unwind: "$fieldNames" },
  {
    $group: {
      _id: "$fieldNames.k",
      usageCount: { $sum: 1 },
      uniqueValues: { $addToSet: "$fieldNames.v" },
    },
  },
  { $sort: { usageCount: -1 } },
];
```

**Charts to Implement:**

1. **Bar Chart**: Most used custom fields
2. **Treemap**: Custom field usage hierarchy
3. **Pie Chart**: Field type distribution
4. **Line Chart**: Custom field adoption trends

#### **Task 2.4.2: Frontend Dashboard Component**

- [ ] **Status**: Pending
- [ ] **Priority**: High
- [ ] **Estimated Time**: 3 days
- [ ] **Dependencies**: Task 2.4.1

**Component Features:**

- Custom field usage analysis
- Field effectiveness metrics
- Adoption rate tracking
- Field optimization recommendations

#### **Task 2.4.3: Field Optimization**

- [ ] **Status**: Pending
- [ ] **Priority**: Medium
- [ ] **Estimated Time**: 1 day
- [ ] **Dependencies**: Task 2.4.2

**Features:**

- Unused field identification
- Field consolidation suggestions
- Data quality analysis
- Field impact assessment

---

## 🛠 **TECHNICAL IMPLEMENTATION DETAILS**

### **Database Indexes Required**

```javascript
// Performance optimization indexes
await Candidate.collection.createIndex({ organizationId: 1, status: 1 });
await Candidate.collection.createIndex({ "tracking.createdAt": -1 });
await Candidate.collection.createIndex({ "assignment.interviewerId": 1 });
await Job.collection.createIndex({ organizationId: 1, status: 1 });
await User.collection.createIndex({ organizationId: 1, role: 1 });
await History.collection.createIndex({
  candidateId: 1,
  "history.dateTime": -1,
});
```

### **API Endpoints Structure**

```
/api/analytics/
├── candidate-funnel
├── job-performance
├── interview-assignments
├── application-trends
├── ai-scores
├── geographic
├── user-activity
└── custom-fields
```

### **Frontend Components Structure**

```
src/app/dashboard/analytics/
├── components/
│   ├── CandidateFunnelChart.tsx
│   ├── JobPerformanceChart.tsx
│   ├── InterviewAssignmentChart.tsx
│   ├── ApplicationTrendsChart.tsx
│   ├── AIScoreChart.tsx
│   ├── GeographicChart.tsx
│   ├── UserActivityChart.tsx
│   └── CustomFieldChart.tsx
├── page.tsx
└── layout.tsx
```

### **Chart Library Recommendations**

- **Primary**: Recharts (React-based, lightweight)
- **Secondary**: Chart.js (for complex visualizations)
- **Maps**: Leaflet or Mapbox for geographic data
- **Advanced**: D3.js for custom visualizations

---

## 📊 **CHART SPECIFICATIONS**

### **Phase 1 Charts**

#### **1. Candidate Funnel Chart**

```typescript
interface FunnelData {
  stage: string;
  count: number;
  conversionRate: number;
  color: string;
}

// Chart Type: Funnel/Waterfall
// Colors: Stage-specific color scheme
// Interactions: Click to drill down
// Export: PNG, PDF, CSV
```

#### **2. Job Performance Scatter Plot**

```typescript
interface JobPerformanceData {
  jobId: string;
  title: string;
  applications: number;
  timeToFill: number;
  successRate: number;
}

// Chart Type: Scatter Plot
// X-Axis: Applications
// Y-Axis: Time to Fill
// Size: Success Rate
// Color: Job Status
```

#### **3. Interview Assignment Heat Map**

```typescript
interface AssignmentData {
  interviewerId: string;
  interviewerName: string;
  assignments: number;
  completions: number;
  avgRating: number;
}

// Chart Type: Heat Map
// X-Axis: Interviewers
// Y-Axis: Time Periods
// Color: Assignment Count
// Size: Completion Rate
```

#### **4. Application Trends Line Chart**

```typescript
interface TrendData {
  date: string;
  applications: number;
  trend: "up" | "down" | "stable";
}

// Chart Type: Line Chart
// X-Axis: Time (Daily/Weekly/Monthly)
// Y-Axis: Application Count
// Trend Lines: Moving averages
// Annotations: Peak periods
```

### **Phase 2 Charts**

#### **1. AI Score Distribution Histogram**

```typescript
interface ScoreData {
  scoreRange: string;
  count: number;
  percentage: number;
  dimension: "overall" | "experience" | "skills" | "affordability";
}

// Chart Type: Histogram
// X-Axis: Score Ranges (0-10)
// Y-Axis: Candidate Count
// Multiple Series: Different dimensions
// Overlay: Normal distribution curve
```

#### **2. Geographic Choropleth Map**

```typescript
interface GeographicData {
  location: string;
  candidateCount: number;
  avgExperience: number;
  avgSalary: number;
  coordinates: [number, number];
}

// Chart Type: Choropleth Map
// Color Scale: Candidate density
// Popup: Location details
// Filter: Experience level, salary range
// Clustering: For dense areas
```

#### **3. User Activity Timeline**

```typescript
interface ActivityData {
  userId: string;
  userName: string;
  role: string;
  activityCount: number;
  lastActive: Date;
  features: string[];
}

// Chart Type: Timeline
// X-Axis: Time
// Y-Axis: Users
// Color: Activity level
// Size: Feature usage
```

#### **4. Custom Field Usage Treemap**

```typescript
interface CustomFieldData {
  fieldName: string;
  usageCount: number;
  uniqueValues: number;
  fieldType: string;
  effectiveness: number;
}

// Chart Type: Treemap
// Size: Usage count
// Color: Effectiveness
// Hover: Field details
// Drill-down: Value distribution
```

---

## 🎨 **UI/UX SPECIFICATIONS**

### **Dashboard Layout**

```typescript
interface AnalyticsLayout {
  header: {
    title: string;
    dateRange: DateRange;
    filters: FilterOptions;
    exportButtons: ExportOptions;
  };
  sidebar: {
    reportCategories: ReportCategory[];
    savedReports: SavedReport[];
    quickActions: QuickAction[];
  };
  main: {
    charts: ChartComponent[];
    insights: InsightPanel[];
    metrics: MetricCard[];
  };
}
```

### **Responsive Design**

- **Desktop**: Full dashboard with multiple charts
- **Tablet**: Sidebar collapsible, charts stackable
- **Mobile**: Single chart view with navigation

### **Theme Integration**

- **Light Mode**: Clean, professional appearance
- **Dark Mode**: Reduced eye strain for data analysis

---

## 📈 **SUCCESS METRICS**

### **Phase 1 Success Criteria**

- [ ] All 4 reports implemented and functional
- [ ] Real-time data updates working
- [ ] Export functionality operational
- [ ] Performance: < 2s load time for each report
- [ ] User adoption: > 80% of admin/HR users accessing reports

### **Phase 2 Success Criteria**

- [ ] All 4 additional reports implemented
- [ ] Advanced filtering and drill-down capabilities
- [ ] Interactive visualizations working
- [ ] Performance: < 3s load time for complex reports
- [ ] User satisfaction: > 4.5/5 rating for analytics features

### **Overall Project Success**

- [ ] Complete analytics dashboard operational
- [ ] Data accuracy: > 99% match with source data
- [ ] System performance: No impact on existing functionality
- [ ] User training: Documentation and tutorials created
- [ ] Future scalability: Architecture supports additional reports

---

## 🚀 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment**

- [ ] All API endpoints tested
- [ ] Database indexes created
- [ ] Frontend components tested
- [ ] Performance benchmarks established
- [ ] Security review completed

### **Deployment**

- [ ] Backend APIs deployed
- [ ] Frontend components deployed
- [ ] Database migrations applied
- [ ] Monitoring configured
- [ ] Error tracking enabled

### **Post-Deployment**

- [ ] User acceptance testing
- [ ] Performance monitoring
- [ ] Bug fixes and optimizations
- [ ] User training sessions
- [ ] Documentation updates

---

## 📝 **NOTES & CONSIDERATIONS**

### **Performance Considerations**

- Implement data caching for frequently accessed reports
- Use pagination for large datasets
- Optimize aggregation pipelines
- Consider data archiving for historical reports

### **Security Considerations**

- Role-based access to analytics data
- Data anonymization for sensitive information
- Audit logging for report access
- Export restrictions for confidential data

### **Scalability Considerations**

- Modular chart components for easy extension
- Configurable data sources
- Plugin architecture for custom reports
- API versioning for future changes

### **User Experience Considerations**

- Intuitive navigation between reports
- Consistent design language
- Helpful tooltips and guidance
- Mobile-responsive design
- Accessibility compliance

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Next Review**: [Date + 1 week]
**Status**: Ready for Implementation
