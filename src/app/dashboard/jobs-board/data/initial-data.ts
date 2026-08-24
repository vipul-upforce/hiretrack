import { Job } from '@/types/job';
import { KanbanColumn } from '@/types/kanban';

export const initialJobs = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    // company: 'TechCorp Solutions',
    description: `We are looking for a Senior Frontend Developer to join our dynamic team. 

Key Responsibilities:
- Lead frontend development initiatives
- Mentor junior developers
- Implement responsive designs
- Optimize application performance
- Collaborate with UI/UX designers

Required Technical Skills:
- React.js
- TypeScript
- Next.js
- State Management (Redux/Context)
- CSS-in-JS`,
    skills: ['React', 'TypeScript', 'Next.js', 'Redux', 'Tailwind CSS'],
    experience: { min: 5, inText: '5' },
    links: [
      'https://techcorp.com/careers/senior-frontend',
      'https://linkedin.com/company/techcorp',
    ],
    // validTill: addDays(new Date(), 30),
    status: 'open',
    attachments: {
      files: [
        {
          id: 'jd-pdf-1',
          name: 'Frontend-JD.pdf',
          url: '/job-docs/frontend-jd.pdf',
          type: 'pdf',
          size: 2500000, // 2.5MB
        },
      ],
      images: [
        {
          id: 'company-img-1',
          name: 'office-space.jpg',
          url: '/images/office-space.jpg',
          type: 'image',
          size: 1500000, // 1.5MB
        },
      ],
    },
    tracking: {
      createdAt: new Date(),
      openedAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: '2',
    title: 'Backend Engineer',
    // company: 'DataFlow Systems',
    description: `Backend Engineer position for our cloud infrastructure team.

Requirements:
- Strong experience with Node.js and TypeScript
- Experience with MongoDB and SQL databases
- Knowledge of AWS services
- Understanding of microservices architecture
- Experience with Docker and Kubernetes

We offer:
- Competitive salary
- Remote work options
- Health insurance
- Professional development budget`,
    skills: ['Node.js', 'MongoDB', 'AWS', 'Docker', 'Kubernetes'],
    experience: { min: 3, inText: '3' },
    links: ['https://dataflow.io/careers/backend-engineer'],
    // validTill: addDays(new Date(), 45),
    status: 'open',
    attachments: {
      files: [
        {
          id: 'jd-pdf-2',
          name: 'Backend-Engineer-JD.pdf',
          url: '/job-docs/backend-jd.pdf',
          type: 'pdf',
          size: 3000000, // 3MB
        },
      ],
      images: [
        {
          id: 'company-img-2',
          name: 'company-culture.jpg',
          url: '/images/company-culture.jpg',
          type: 'image',
          size: 1800000, // 1.8MB
        },
      ],
    },
    tracking: {
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      openedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  },
  {
    id: '3',
    title: 'DevOps Engineer',
    // company: 'CloudScale Inc',
    description: `Join our DevOps team to help build and maintain our cloud infrastructure.

Key Responsibilities:
- Manage CI/CD pipelines
- Implement infrastructure as code
- Monitor system performance
- Automate deployment processes
- Ensure system security

Required Skills:
- AWS/Azure/GCP
- Terraform
- Jenkins/GitLab CI
- Docker & Kubernetes
- Shell scripting`,
    skills: ['AWS', 'Terraform', 'Docker', 'Kubernetes', 'Jenkins'],
    experience: { min: 4, inText: '4' },
    links: [
      'https://cloudscale.com/careers/devops',
      'https://github.com/cloudscale',
    ],
    // validTill: addDays(new Date(), 60),
    status: 'draft',
    attachments: {
      files: [
        {
          id: 'jd-pdf-3',
          name: 'DevOps-JD.pdf',
          url: '/job-docs/devops-jd.pdf',
          type: 'pdf',
          size: 2800000, // 2.8MB
        },
      ],
      images: [
        {
          id: 'company-img-3',
          name: 'team-photo.jpg',
          url: '/images/team-photo.jpg',
          type: 'image',
          size: 1600000, // 1.6MB
        },
      ],
    },
    tracking: {
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updatedAt: new Date(),
    },
  },
];

export const initialColumns: KanbanColumn[] = [
  {
    id: 'draft',
    title: 'Draft',
    jobs: [] as Job[],
  },
  {
    id: 'open',
    title: 'Open',
    jobs: [] as Job[],
  },
  {
    id: 'closed',
    title: 'Closed',
    jobs: [] as Job[],
  },
];
