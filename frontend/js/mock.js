const MOCK_VERSION = 3;
const MOCK_STORE_KEY = 'rc3-mock-db';

const SCORE_WEIGHTS =
{
    skills: 0.40,
    experience: 0.25,
    projects: 0.20,
    qualifications: 0.15
};

const IMPORTANCE_WEIGHT = { high: 3, medium: 2, low: 1 };
const REQUIREMENT_WEIGHT = { required: 1.5, preferred: 1 };
const UNVERIFIED_PENALTY = 0.75;

const TRANSITIONS =
{
    'Submitted': ['Parsed', 'Rejected'],
    'Parsed': ['AI Assessment Available', 'Rejected'],
    'AI Assessment Available': ['Recruiter Review', 'Rejected'],
    'Recruiter Review': ['Shortlisted', 'Rejected'],
    'Shortlisted': ['Interview', 'Rejected'],
    'Interview': ['Selected', 'Rejected'],
    'Selected': [],
    'Rejected': []
};

const REVIEW_STATES = ['Submitted', 'Parsed', 'AI Assessment Available', 'Recruiter Review'];

const SKILL_LIBRARY = [
    'Python', 'Django', 'Flask', 'PostgreSQL', 'MySQL', 'Docker', 'Kubernetes',
    'REST APIs', 'GraphQL', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js',
    'HTML', 'CSS', 'SQL', 'Excel', 'Git', 'AWS', 'Redis', 'Celery', 'Testing',
    'CI/CD', 'Linux', 'Data Analysis', 'Pandas', 'Machine Learning'
];

function seedUsers()
{
    return [
        { id: 1, name: 'Hina Recruiter', email: 'recruiter@test.com', password: '12345678', role: 'recruiter' },
        { id: 2, name: 'Ali Candidate', email: 'candidate@test.com', password: '12345678', role: 'candidate' },
        { id: 3, name: 'Ayesha Khan', email: 'ayesha.khan@example.com', password: '12345678', role: 'candidate' },
        { id: 4, name: 'Bilal Ahmed', email: 'bilal.ahmed@example.com', password: '12345678', role: 'candidate' },
        { id: 5, name: 'Hamza Raza', email: 'hamza.raza@example.com', password: '12345678', role: 'candidate' },
        { id: 6, name: 'Zara Malik', email: 'zara.malik@example.com', password: '12345678', role: 'candidate' },
        { id: 7, name: 'Omar Siddiqui', email: 'omar.siddiqui@example.com', password: '12345678', role: 'candidate' },
        { id: 8, name: 'Sana Javed', email: 'sana.javed@example.com', password: '12345678', role: 'candidate' }
    ];
}

function seedJobs()
{
    return [
        {
            id: 1,
            title: 'Backend Developer',
            department: 'Engineering',
            location: 'Lahore, Pakistan',
            type: 'Full-time',
            salary: 'PKR 250,000 - 350,000',
            description: 'Build and maintain REST APIs for our recruitment platform using Python and Django.',
            experienceYears: 3,
            qualifications: 'BS in Computer Science or equivalent experience',
            status: 'open',
            createdAt: '2026-10-20T09:00:00Z',
            skills: [
                { skill: 'Python', requirement: 'required', importance: 'high' },
                { skill: 'Django', requirement: 'required', importance: 'high' },
                { skill: 'PostgreSQL', requirement: 'required', importance: 'medium' },
                { skill: 'Docker', requirement: 'preferred', importance: 'medium' },
                { skill: 'REST APIs', requirement: 'required', importance: 'high' }
            ]
        },
        {
            id: 2,
            title: 'Frontend Developer',
            department: 'Engineering',
            location: 'Remote',
            type: 'Contract',
            salary: 'PKR 180,000 - 260,000',
            description: 'Create responsive user interfaces with HTML, CSS and JavaScript.',
            experienceYears: 2,
            qualifications: 'BS in Computer Science or related field',
            status: 'open',
            createdAt: '2026-10-24T11:30:00Z',
            skills: [
                { skill: 'JavaScript', requirement: 'required', importance: 'high' },
                { skill: 'React', requirement: 'preferred', importance: 'medium' },
                { skill: 'CSS', requirement: 'required', importance: 'medium' }
            ]
        },
        {
            id: 3,
            title: 'Data Analyst',
            department: 'Analytics',
            location: 'Karachi, Pakistan',
            type: 'Full-time',
            salary: 'PKR 150,000 - 220,000',
            description: 'Analyse hiring data and prepare weekly reports for the management team.',
            experienceYears: 1,
            qualifications: 'BS in Statistics, Mathematics or Computer Science',
            status: 'closed',
            createdAt: '2026-09-30T08:15:00Z',
            skills: [
                { skill: 'SQL', requirement: 'required', importance: 'high' },
                { skill: 'Excel', requirement: 'required', importance: 'medium' },
                { skill: 'Python', requirement: 'preferred', importance: 'low' }
            ]
        }
    ];
}

function seedProfiles()
{
    return {
        2:
        {
            userId: 2,
            name: 'Ali Candidate',
            email: 'candidate@test.com',
            phone: '+92 300 5550100',
            headline: 'Backend Developer',
            skills: [
                { skill: 'Python', verified: true },
                { skill: 'Django', verified: true },
                { skill: 'PostgreSQL', verified: false },
                { skill: 'Docker', verified: false },
                { skill: 'REST APIs', verified: true }
            ],
            education: [
                { qualification: 'BS Computer Science', institution: 'FAST NUCES Lahore', from: '2018', to: '2022' }
            ],
            experience: [
                { role: 'Backend Developer', company: 'VentureDive', from: '2022-07', to: 'Present', summary: 'Builds Django services and PostgreSQL schemas for a logistics product.' }
            ],
            projects: [
                { name: 'Freight API', summary: 'Django REST API handling 40k requests per day with Redis caching.' }
            ],
            resumeFileName: 'ali-candidate-resume.pdf',
            parsedAt: '2026-11-01T09:31:00Z'
        },
        3:
        {
            userId: 3,
            name: 'Ayesha Khan',
            email: 'ayesha.khan@example.com',
            phone: '+92 300 1234567',
            headline: 'Senior Backend Developer',
            skills: [
                { skill: 'Python', verified: true },
                { skill: 'Django', verified: true },
                { skill: 'PostgreSQL', verified: true },
                { skill: 'Docker', verified: true },
                { skill: 'REST APIs', verified: true }
            ],
            education: [
                { qualification: 'BS Computer Science', institution: 'LUMS Lahore', from: '2017', to: '2021' }
            ],
            experience: [
                { role: 'Backend Developer', company: 'Systems Limited', from: '2021-08', to: 'Present', summary: 'Leads a Django team serving 20k daily users across three services.' }
            ],
            projects: [
                { name: 'Payments Service', summary: 'Django and PostgreSQL service containerised with Docker and Docker Compose.' },
                { name: 'Hiring API', summary: 'Designed and documented REST APIs consumed by mobile and web clients.' }
            ],
            resumeFileName: 'ayesha-khan-resume.pdf',
            parsedAt: '2026-11-01T09:31:00Z'
        },
        4:
        {
            userId: 4,
            name: 'Bilal Ahmed',
            email: 'bilal.ahmed@example.com',
            phone: '+92 301 7654321',
            headline: 'Python Developer',
            skills: [
                { skill: 'Python', verified: true },
                { skill: 'Flask', verified: true },
                { skill: 'MySQL', verified: true },
                { skill: 'REST APIs', verified: false }
            ],
            education: [
                { qualification: 'BS Software Engineering', institution: 'PUCIT Lahore', from: '2019', to: '2023' }
            ],
            experience: [
                { role: 'Python Developer', company: 'NetSol', from: '2023-02', to: 'Present', summary: 'Maintains internal Flask tooling backed by MySQL.' }
            ],
            projects: [
                { name: 'Inventory System', summary: 'Flask application with REST endpoints and a MySQL schema.' }
            ],
            resumeFileName: 'bilal-ahmed-resume.pdf',
            parsedAt: '2026-11-02T11:11:00Z'
        },
        5:
        {
            userId: 5,
            name: 'Hamza Raza',
            email: 'hamza.raza@example.com',
            phone: '+92 302 1112223',
            headline: 'Frontend Developer',
            skills: [
                { skill: 'HTML', verified: true },
                { skill: 'CSS', verified: true },
                { skill: 'JavaScript', verified: true },
                { skill: 'React', verified: true }
            ],
            education: [
                { qualification: 'BS Computer Science', institution: 'COMSATS Islamabad', from: '2020', to: '2024' }
            ],
            experience: [
                { role: 'Frontend Developer', company: 'Techlogix', from: '2024-01', to: 'Present', summary: 'Builds React interfaces and consumes REST APIs.' }
            ],
            projects: [
                { name: 'Storefront UI', summary: 'React storefront consuming third party REST APIs.' }
            ],
            resumeFileName: 'hamza-raza-resume.pdf',
            parsedAt: '2026-11-03T15:46:00Z'
        },
        6:
        {
            userId: 6,
            name: 'Zara Malik',
            email: 'zara.malik@example.com',
            phone: '+92 303 4445556',
            headline: 'Frontend Engineer',
            skills: [
                { skill: 'JavaScript', verified: true },
                { skill: 'TypeScript', verified: true },
                { skill: 'React', verified: true },
                { skill: 'CSS', verified: false }
            ],
            education: [
                { qualification: 'BS Computer Science', institution: 'IBA Karachi', from: '2018', to: '2022' }
            ],
            experience: [
                { role: 'Frontend Engineer', company: 'Careem', from: '2022-09', to: 'Present', summary: 'Ships React and TypeScript interfaces for the rider app.' }
            ],
            projects: [
                { name: 'Design System', summary: 'Component library in React with CSS tokens and Storybook.' }
            ],
            resumeFileName: 'zara-malik-resume.pdf',
            parsedAt: '2026-11-02T10:05:00Z'
        },
        7:
        {
            userId: 7,
            name: 'Omar Siddiqui',
            email: 'omar.siddiqui@example.com',
            phone: '+92 304 7778889',
            headline: 'Data Analyst',
            skills: [
                { skill: 'SQL', verified: true },
                { skill: 'Excel', verified: true },
                { skill: 'Pandas', verified: false }
            ],
            education: [
                { qualification: 'BS Statistics', institution: 'University of Karachi', from: '2019', to: '2023' }
            ],
            experience: [
                { role: 'Data Analyst', company: 'Interloop', from: '2023-03', to: 'Present', summary: 'Builds SQL reporting pipelines and weekly management dashboards.' }
            ],
            projects: [
                { name: 'Hiring Report', summary: 'SQL and Excel report tracking time to hire across four sites.' }
            ],
            resumeFileName: 'omar-siddiqui-resume.pdf',
            parsedAt: '2026-10-05T09:20:00Z'
        },
        8:
        {
            userId: 8,
            name: 'Sana Javed',
            email: 'sana.javed@example.com',
            phone: '+92 305 2223334',
            headline: 'Senior Data Analyst',
            skills: [
                { skill: 'SQL', verified: true },
                { skill: 'Excel', verified: true },
                { skill: 'Python', verified: true },
                { skill: 'Data Analysis', verified: true }
            ],
            education: [
                { qualification: 'MS Data Science', institution: 'NUST Islamabad', from: '2020', to: '2022' }
            ],
            experience: [
                { role: 'Senior Data Analyst', company: 'Jazz', from: '2022-06', to: 'Present', summary: 'Owns SQL warehouses and Python reporting for the commercial team.' }
            ],
            projects: [
                { name: 'Churn Model', summary: 'Python and SQL churn model with weekly Excel reporting.' }
            ],
            resumeFileName: 'sana-javed-resume.pdf',
            parsedAt: '2026-10-06T12:40:00Z'
        }
    };
}

function seedApplications()
{
    return [
        {
            id: 101,
            jobId: 1,
            candidateId: 3,
            status: 'AI Assessment Available',
            score: 87,
            overrideScore: null,
            overrideReason: null,
            appliedAt: '2026-11-01T09:30:00Z',
            updatedAt: '2026-11-01T09:33:00Z',
            resumeFileName: 'ayesha-khan-resume.pdf',
            score_json:
            {
                total: 87,
                breakdown: { skills: 92, experience: 84, projects: 88, qualifications: 78 },
                matched_skills: [
                    { skill: 'Python', similarity: 0.95, verified: true, excerpt: 'Built REST services in Python and Django serving 20k daily users.' },
                    { skill: 'Django', similarity: 0.93, verified: true, excerpt: 'Led migration of a Django monolith to modular apps.' },
                    { skill: 'PostgreSQL', similarity: 0.9, verified: true, excerpt: 'Designed PostgreSQL schemas and tuned slow queries.' },
                    { skill: 'Docker', similarity: 0.88, verified: true, excerpt: 'Containerised services with Docker and Docker Compose.' },
                    { skill: 'REST APIs', similarity: 0.92, verified: true, excerpt: 'Designed and documented REST APIs consumed by mobile apps.' }
                ],
                gaps: [],
                explanation: 'Ayesha matches every required skill with clear evidence from two relevant projects and three years of backend experience.',
                learning_areas: ['Kubernetes basics', 'Message queues'],
                unsupported_claims: []
            },
            history: [
                { from: null, to: 'Submitted', changedBy: 'Ayesha Khan', at: '2026-11-01T09:30:00Z' },
                { from: 'Submitted', to: 'Parsed', changedBy: 'system', at: '2026-11-01T09:31:00Z' },
                { from: 'Parsed', to: 'AI Assessment Available', changedBy: 'system', at: '2026-11-01T09:33:00Z' }
            ],
            notes: []
        },
        {
            id: 102,
            jobId: 1,
            candidateId: 4,
            status: 'Recruiter Review',
            score: 53,
            overrideScore: null,
            overrideReason: null,
            appliedAt: '2026-11-02T11:10:00Z',
            updatedAt: '2026-11-03T09:05:00Z',
            resumeFileName: 'bilal-ahmed-resume.pdf',
            score_json:
            {
                total: 53,
                breakdown: { skills: 41, experience: 62, projects: 58, qualifications: 64 },
                matched_skills: [
                    { skill: 'Python', similarity: 0.89, verified: true, excerpt: 'Developed internal tools in Python and Flask.' },
                    { skill: 'REST APIs', similarity: 0.8, verified: false, excerpt: 'Created REST endpoints for an inventory system.' }
                ],
                gaps: [
                    { skill: 'Django', label: 'no_evidence' },
                    { skill: 'PostgreSQL', label: 'no_evidence' },
                    { skill: 'Docker', label: 'confirmed_absent' }
                ],
                explanation: 'Bilal has solid Python and API experience with Flask and MySQL, but shows no evidence of Django, PostgreSQL or Docker.',
                learning_areas: ['Django framework', 'PostgreSQL', 'Docker fundamentals'],
                unsupported_claims: [
                    { claim: 'REST API design', excerpt: 'Created REST endpoints for an inventory system.', reason: 'The resume describes consuming and creating endpoints but shows no evidence of API design ownership.', reviewed: false }
                ]
            },
            history: [
                { from: null, to: 'Submitted', changedBy: 'Bilal Ahmed', at: '2026-11-02T11:10:00Z' },
                { from: 'Submitted', to: 'Parsed', changedBy: 'system', at: '2026-11-02T11:11:00Z' },
                { from: 'Parsed', to: 'AI Assessment Available', changedBy: 'system', at: '2026-11-02T11:14:00Z' },
                { from: 'AI Assessment Available', to: 'Recruiter Review', changedBy: 'Hina Recruiter', at: '2026-11-03T09:05:00Z' }
            ],
            notes: [
                { id: 1, text: 'Flask background is relevant but the role is Django heavy. Worth a technical screen only if we cannot fill from the top of the list.', author: 'Hina Recruiter', at: '2026-11-03T09:12:00Z' }
            ]
        },
        {
            id: 103,
            jobId: 1,
            candidateId: 5,
            status: 'Submitted',
            score: 21,
            overrideScore: null,
            overrideReason: null,
            appliedAt: '2026-11-03T15:45:00Z',
            updatedAt: '2026-11-03T15:45:00Z',
            resumeFileName: 'hamza-raza-resume.pdf',
            score_json:
            {
                total: 21,
                breakdown: { skills: 11, experience: 25, projects: 20, qualifications: 40 },
                matched_skills: [
                    { skill: 'REST APIs', similarity: 0.45, verified: true, excerpt: 'Consumed REST APIs in React applications.' }
                ],
                gaps: [
                    { skill: 'Python', label: 'no_evidence' },
                    { skill: 'Django', label: 'no_evidence' },
                    { skill: 'PostgreSQL', label: 'no_evidence' },
                    { skill: 'Docker', label: 'no_evidence' }
                ],
                explanation: 'Hamza has frontend experience with HTML, CSS, JavaScript and React. The resume shows no backend skills asked for in this role.',
                learning_areas: ['Python', 'Backend development', 'Databases'],
                unsupported_claims: []
            },
            history: [
                { from: null, to: 'Submitted', changedBy: 'Hamza Raza', at: '2026-11-03T15:45:00Z' }
            ],
            notes: []
        },
        {
            id: 104,
            jobId: 1,
            candidateId: 2,
            status: 'Shortlisted',
            score: 78,
            overrideScore: null,
            overrideReason: null,
            appliedAt: '2026-11-01T09:30:00Z',
            updatedAt: '2026-11-03T14:20:00Z',
            resumeFileName: 'ali-candidate-resume.pdf',
            score_json:
            {
                total: 78,
                breakdown: { skills: 76, experience: 78, projects: 82, qualifications: 74 },
                matched_skills: [
                    { skill: 'Python', similarity: 0.91, verified: true, excerpt: 'Builds Django services in Python for a logistics product.' },
                    { skill: 'Django', similarity: 0.88, verified: true, excerpt: 'Maintains a Django REST API handling 40k requests per day.' },
                    { skill: 'PostgreSQL', similarity: 0.72, verified: false, excerpt: 'Worked with PostgreSQL schemas.' },
                    { skill: 'REST APIs', similarity: 0.9, verified: true, excerpt: 'Django REST API with Redis caching.' }
                ],
                gaps: [
                    { skill: 'Docker', label: 'no_evidence' }
                ],
                explanation: 'Ali covers Python, Django and REST APIs with production evidence. PostgreSQL is mentioned but not evidenced in depth, and there is no Docker experience.',
                learning_areas: ['Docker', 'PostgreSQL query tuning'],
                unsupported_claims: [
                    { claim: 'PostgreSQL depth', excerpt: 'Worked with PostgreSQL schemas.', reason: 'The excerpt states exposure but gives no evidence of schema design or query tuning.', reviewed: false }
                ]
            },
            history: [
                { from: null, to: 'Submitted', changedBy: 'Ali Candidate', at: '2026-11-01T09:30:00Z' },
                { from: 'Submitted', to: 'Parsed', changedBy: 'system', at: '2026-11-01T09:31:00Z' },
                { from: 'Parsed', to: 'AI Assessment Available', changedBy: 'system', at: '2026-11-01T09:33:00Z' },
                { from: 'AI Assessment Available', to: 'Recruiter Review', changedBy: 'Hina Recruiter', at: '2026-11-02T10:00:00Z' },
                { from: 'Recruiter Review', to: 'Shortlisted', changedBy: 'Hina Recruiter', at: '2026-11-03T14:20:00Z' }
            ],
            notes: [
                { id: 1, text: 'Strong Django evidence. Confirm PostgreSQL depth in the technical screen.', author: 'Hina Recruiter', at: '2026-11-03T14:22:00Z' }
            ]
        },
        {
            id: 105,
            jobId: 2,
            candidateId: 6,
            status: 'Recruiter Review',
            score: 82,
            overrideScore: null,
            overrideReason: null,
            appliedAt: '2026-11-02T10:00:00Z',
            updatedAt: '2026-11-04T09:00:00Z',
            resumeFileName: 'zara-malik-resume.pdf',
            score_json:
            {
                total: 82,
                breakdown: { skills: 84, experience: 80, projects: 84, qualifications: 76 },
                matched_skills: [
                    { skill: 'JavaScript', similarity: 0.94, verified: true, excerpt: 'Ships React and TypeScript interfaces for the rider app.' },
                    { skill: 'React', similarity: 0.95, verified: true, excerpt: 'Component library in React with CSS tokens and Storybook.' },
                    { skill: 'CSS', similarity: 0.78, verified: false, excerpt: 'CSS tokens and Storybook theming.' }
                ],
                gaps: [],
                explanation: 'Zara matches every requirement with production React and TypeScript work plus a design system project.',
                learning_areas: ['Accessibility auditing'],
                unsupported_claims: []
            },
            history: [
                { from: null, to: 'Submitted', changedBy: 'Zara Malik', at: '2026-11-02T10:00:00Z' },
                { from: 'Submitted', to: 'Parsed', changedBy: 'system', at: '2026-11-02T10:02:00Z' },
                { from: 'Parsed', to: 'AI Assessment Available', changedBy: 'system', at: '2026-11-02T10:05:00Z' },
                { from: 'AI Assessment Available', to: 'Recruiter Review', changedBy: 'Hina Recruiter', at: '2026-11-04T09:00:00Z' }
            ],
            notes: []
        },
        {
            id: 106,
            jobId: 2,
            candidateId: 2,
            status: 'Submitted',
            score: null,
            overrideScore: null,
            overrideReason: null,
            appliedAt: '2026-11-04T08:15:00Z',
            updatedAt: '2026-11-04T08:15:00Z',
            resumeFileName: 'ali-candidate-resume.pdf',
            score_json: null,
            history: [
                { from: null, to: 'Submitted', changedBy: 'Ali Candidate', at: '2026-11-04T08:15:00Z' }
            ],
            notes: []
        },
        {
            id: 107,
            jobId: 3,
            candidateId: 7,
            status: 'Rejected',
            score: 64,
            overrideScore: null,
            overrideReason: null,
            appliedAt: '2026-10-05T09:15:00Z',
            updatedAt: '2026-10-12T13:00:00Z',
            resumeFileName: 'omar-siddiqui-resume.pdf',
            score_json:
            {
                total: 64,
                breakdown: { skills: 66, experience: 60, projects: 62, qualifications: 68 },
                matched_skills: [
                    { skill: 'SQL', similarity: 0.9, verified: true, excerpt: 'Builds SQL reporting pipelines and weekly management dashboards.' },
                    { skill: 'Excel', similarity: 0.86, verified: true, excerpt: 'SQL and Excel report tracking time to hire across four sites.' }
                ],
                gaps: [
                    { skill: 'Python', label: 'no_evidence' }
                ],
                explanation: 'Omar covers the required SQL and Excel skills but has no Python, which the team wanted for automation.',
                learning_areas: ['Python for analysis', 'Pandas'],
                unsupported_claims: []
            },
            history: [
                { from: null, to: 'Submitted', changedBy: 'Omar Siddiqui', at: '2026-10-05T09:15:00Z' },
                { from: 'Submitted', to: 'Parsed', changedBy: 'system', at: '2026-10-05T09:18:00Z' },
                { from: 'Parsed', to: 'AI Assessment Available', changedBy: 'system', at: '2026-10-05T09:20:00Z' },
                { from: 'AI Assessment Available', to: 'Recruiter Review', changedBy: 'Hina Recruiter', at: '2026-10-08T10:00:00Z' },
                { from: 'Recruiter Review', to: 'Rejected', changedBy: 'Hina Recruiter', at: '2026-10-12T13:00:00Z' }
            ],
            notes: []
        },
        {
            id: 108,
            jobId: 3,
            candidateId: 8,
            status: 'Selected',
            score: 91,
            overrideScore: null,
            overrideReason: null,
            appliedAt: '2026-10-06T12:30:00Z',
            updatedAt: '2026-10-20T15:30:00Z',
            resumeFileName: 'sana-javed-resume.pdf',
            score_json:
            {
                total: 91,
                breakdown: { skills: 94, experience: 88, projects: 90, qualifications: 88 },
                matched_skills: [
                    { skill: 'SQL', similarity: 0.96, verified: true, excerpt: 'Owns SQL warehouses and Python reporting for the commercial team.' },
                    { skill: 'Excel', similarity: 0.9, verified: true, excerpt: 'Python and SQL churn model with weekly Excel reporting.' },
                    { skill: 'Python', similarity: 0.93, verified: true, excerpt: 'Python reporting pipelines and a churn model.' }
                ],
                gaps: [],
                explanation: 'Sana exceeds every requirement with warehouse ownership, Python automation and an MS in Data Science.',
                learning_areas: ['Stakeholder storytelling'],
                unsupported_claims: []
            },
            history: [
                { from: null, to: 'Submitted', changedBy: 'Sana Javed', at: '2026-10-06T12:30:00Z' },
                { from: 'Submitted', to: 'Parsed', changedBy: 'system', at: '2026-10-06T12:35:00Z' },
                { from: 'Parsed', to: 'AI Assessment Available', changedBy: 'system', at: '2026-10-06T12:40:00Z' },
                { from: 'AI Assessment Available', to: 'Recruiter Review', changedBy: 'Hina Recruiter', at: '2026-10-09T09:30:00Z' },
                { from: 'Recruiter Review', to: 'Shortlisted', changedBy: 'Hina Recruiter', at: '2026-10-11T11:00:00Z' },
                { from: 'Shortlisted', to: 'Interview', changedBy: 'Hina Recruiter', at: '2026-10-14T10:00:00Z' },
                { from: 'Interview', to: 'Selected', changedBy: 'Hina Recruiter', at: '2026-10-20T15:30:00Z' }
            ],
            notes: []
        }
    ];
}

function seedQuestions()
{
    return [
        {
            id: 9001,
            applicationId: 104,
            level: 'beginner',
            text: 'Walk me through how you would model a logistics shipment table in PostgreSQL. What keys and indexes would you add and why?',
            guideline: 'Look for a clear primary key, foreign keys to order and carrier tables, and an index on the lookup column used by the dispatch screen. A strong answer mentions why the index matters for the query pattern, not just that indexes exist.',
            skill: 'PostgreSQL'
        },
        {
            id: 9002,
            applicationId: 104,
            level: 'intermediate',
            text: 'Your Django REST API handles 40k requests a day. How did you decide what to cache in Redis, and how do you invalidate it?',
            guideline: 'Expect a concrete invalidation strategy rather than a TTL only. Good answers discuss cache keys, stale data risk, and how they measured whether caching actually helped.',
            skill: 'Django'
        },
        {
            id: 9003,
            applicationId: 104,
            level: 'advanced',
            text: 'The resume mentions PostgreSQL but the evidence is thin. Describe a slow query you diagnosed in production, how you found it and what you changed.',
            guideline: 'This probes the unverified PostgreSQL claim. A credible answer names a tool (EXPLAIN ANALYZE, pg_stat_statements), describes the plan, and explains the fix. Vague answers suggest the claim is overstated.',
            skill: 'PostgreSQL'
        }
    ];
}

function seedInterviews()
{
    return [
        {
            id: 501,
            applicationId: 104,
            jobId: 1,
            candidateId: 2,
            candidateName: 'Ali Candidate',
            jobTitle: 'Backend Developer',
            interviewer: 'Hina Recruiter',
            interview_type: 'technical',
            scheduled_at: '2026-11-10T14:00:00Z',
            duration_minutes: 45,
            status: 'scheduled',
            feedback: null,
            createdAt: '2026-11-04T09:30:00Z'
        }
    ];
}

function seedNotifications()
{
    return [
        { id: 1, userId: 2, message: 'Your application for Backend Developer has been shortlisted.', createdAt: '2026-11-03T14:20:00Z', read: false },
        { id: 2, userId: 2, message: 'Your application for Frontend Developer was received.', createdAt: '2026-11-04T08:15:00Z', read: false }
    ];
}

function seedState()
{
    return {
        version: MOCK_VERSION,
        users: seedUsers(),
        jobs: seedJobs(),
        profiles: seedProfiles(),
        applications: seedApplications(),
        questions: seedQuestions(),
        interviews: seedInterviews(),
        notifications: seedNotifications(),
        nextIds: { job: 4, application: 109, question: 9004, interview: 502, notification: 3, note: 2 }
    };
}

const MockStore =
{
    state: null,

    load()
    {
        if (MockStore.state)
        {
            return MockStore.state;
        }

        let saved = null;

        try
        {
            saved = JSON.parse(localStorage.getItem(MOCK_STORE_KEY));
        }
        catch (error)
        {
            saved = null;
        }

        if (saved && saved.version === MOCK_VERSION)
        {
            MockStore.state = saved;
        }
        else
        {
            MockStore.state = seedState();
            MockStore.save();
        }

        return MockStore.state;
    },

    save()
    {
        try
        {
            localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(MockStore.state));
        }
        catch (error)
        {
            // Private browsing can block storage; the session still works in memory.
        }
    },

    reset()
    {
        MockStore.state = seedState();
        MockStore.save();
        return MockStore.state;
    },

    nextId(key)
    {
        const state = MockStore.load();
        const id = state.nextIds[key];
        state.nextIds[key] = id + 1;
        MockStore.save();
        return id;
    }
};

const Scoring =
{
    skillWeight(jobSkill)
    {
        const importance = IMPORTANCE_WEIGHT[jobSkill.importance] || 1;
        const requirement = REQUIREMENT_WEIGHT[jobSkill.requirement] || 1;
        return importance * requirement;
    },

    skillsComponent(job, scoreJson)
    {
        if (!job || !job.skills || !job.skills.length)
        {
            return scoreJson && scoreJson.breakdown ? scoreJson.breakdown.skills : 0;
        }

        const matched = (scoreJson && scoreJson.matched_skills) || [];
        const absent = ((scoreJson && scoreJson.gaps) || [])
            .filter(function (gap) { return gap.label === 'confirmed_absent'; })
            .map(function (gap) { return gap.skill.toLowerCase(); });

        let earned = 0;
        let possible = 0;

        for (let i = 0; i < job.skills.length; i++)
        {
            const jobSkill = job.skills[i];
            const weight = Scoring.skillWeight(jobSkill);
            possible += weight * 100;

            if (absent.indexOf(jobSkill.skill.toLowerCase()) !== -1)
            {
                continue;
            }

            let hit = null;

            for (let j = 0; j < matched.length; j++)
            {
                if (matched[j].skill.toLowerCase() === jobSkill.skill.toLowerCase())
                {
                    hit = matched[j];
                    break;
                }
            }

            if (!hit)
            {
                continue;
            }

            const penalty = hit.verified === false ? UNVERIFIED_PENALTY : 1;
            earned += weight * 100 * Math.max(0, Math.min(1, Number(hit.similarity) || 0)) * penalty;
        }

        return possible ? Math.round(earned / possible * 100) : 0;
    },

    total(breakdown)
    {
        return Math.round(
            SCORE_WEIGHTS.skills * breakdown.skills +
            SCORE_WEIGHTS.experience * breakdown.experience +
            SCORE_WEIGHTS.projects * breakdown.projects +
            SCORE_WEIGHTS.qualifications * breakdown.qualifications
        );
    },

    rescore(application)
    {
        const job = MockApi.findJob(application.jobId);

        if (!application.score_json || !job)
        {
            return application;
        }

        application.score_json.breakdown.skills = Scoring.skillsComponent(job, application.score_json);
        application.score_json.total = Scoring.total(application.score_json.breakdown);
        application.score = application.score_json.total;
        application.updatedAt = new Date().toISOString();
        MockStore.save();
        return application;
    }
};

const MockApi =
{
    fail(status, message)
    {
        throw { status: status, message: message };
    },

    clone(data)
    {
        return JSON.parse(JSON.stringify(data));
    },

    publicUser(user)
    {
        return { id: user.id, name: user.name, email: user.email, role: user.role };
    },

    userFromToken(token)
    {
        if (!token || token.indexOf('mock-token-') !== 0)
        {
            return null;
        }

        const id = Number(token.replace('mock-token-', ''));
        const users = MockStore.load().users;

        for (let i = 0; i < users.length; i++)
        {
            if (users[i].id === id)
            {
                return users[i];
            }
        }

        return null;
    },

    findJob(jobId)
    {
        const jobs = MockStore.load().jobs;

        for (let i = 0; i < jobs.length; i++)
        {
            if (jobs[i].id === Number(jobId))
            {
                return jobs[i];
            }
        }

        return null;
    },

    findApplication(applicationId)
    {
        const applications = MockStore.load().applications;

        for (let i = 0; i < applications.length; i++)
        {
            if (applications[i].id === Number(applicationId))
            {
                return applications[i];
            }
        }

        return null;
    },

    findUser(userId)
    {
        const users = MockStore.load().users;

        for (let i = 0; i < users.length; i++)
        {
            if (users[i].id === Number(userId))
            {
                return users[i];
            }
        }

        return null;
    },

    applicantCount(jobId)
    {
        return MockStore.load().applications.filter(function (application)
        {
            return application.jobId === Number(jobId);
        }).length;
    },

    jobView(job)
    {
        const view = MockApi.clone(job);
        view.applicantCount = MockApi.applicantCount(job.id);
        return view;
    },

    applicantView(application)
    {
        const user = MockApi.findUser(application.candidateId) || {};
        const profile = MockStore.load().profiles[application.candidateId];
        const view = MockApi.clone(application);

        view.candidateName = user.name || 'Unknown candidate';
        view.email = user.email || '';
        view.phone = profile ? profile.phone : '';
        view.effectiveScore = application.overrideScore === null ? application.score : application.overrideScore;
        return view;
    },

    candidateView(application)
    {
        const job = MockApi.findJob(application.jobId);

        return {
            id: application.id,
            jobId: application.jobId,
            jobTitle: job ? job.title : 'Unknown role',
            status: application.status,
            appliedAt: application.appliedAt,
            timeline: application.history.map(function (entry)
            {
                return { status: entry.to, at: entry.at };
            })
        };
    },

    requireUser(user, role)
    {
        if (!user)
        {
            MockApi.fail(401, 'Please log in to continue.');
        }

        if (role && user.role !== role)
        {
            MockApi.fail(403, 'You do not have permission to do this.');
        }
    },

    requireApplication(applicationId)
    {
        const application = MockApi.findApplication(applicationId);

        if (!application)
        {
            MockApi.fail(404, 'This application could not be found.');
        }

        return application;
    },

    login(body)
    {
        const email = String((body && body.email) || '').trim().toLowerCase();
        const password = String((body && body.password) || '');
        const users = MockStore.load().users;

        for (let i = 0; i < users.length; i++)
        {
            if (users[i].email === email && users[i].password === password)
            {
                return { token: 'mock-token-' + users[i].id, user: MockApi.publicUser(users[i]) };
            }
        }

        MockApi.fail(401, 'Incorrect email or password. Please try again.');
    },

    register(body)
    {
        const state = MockStore.load();
        const email = String((body && body.email) || '').trim().toLowerCase();

        for (let i = 0; i < state.users.length; i++)
        {
            if (state.users[i].email === email)
            {
                MockApi.fail(409, 'An account with this email already exists.');
            }
        }

        const user =
        {
            id: state.users.length + 1,
            name: String(body.name || '').trim(),
            email: email,
            password: body.password,
            role: body.role === 'recruiter' ? 'recruiter' : 'candidate'
        };

        state.users.push(user);

        if (user.role === 'candidate')
        {
            state.profiles[user.id] =
            {
                userId: user.id,
                name: user.name,
                email: user.email,
                phone: '',
                headline: '',
                skills: [],
                education: [],
                experience: [],
                projects: [],
                resumeFileName: null,
                parsedAt: null
            };
        }

        MockStore.save();

        return { token: 'mock-token-' + user.id, user: MockApi.publicUser(user) };
    },

    extractRequirements(body)
    {
        const text = String(((body && body.description) || '') + ' ' + ((body && body.title) || '')).toLowerCase();
        const found = [];

        for (let i = 0; i < SKILL_LIBRARY.length; i++)
        {
            const skill = SKILL_LIBRARY[i];

            if (text.indexOf(skill.toLowerCase()) !== -1)
            {
                found.push(skill);
            }
        }

        if (text.indexOf('api') !== -1 && found.indexOf('REST APIs') === -1)
        {
            found.push('REST APIs');
        }

        if (text.indexOf('test') !== -1 && found.indexOf('Testing') === -1)
        {
            found.push('Testing');
        }

        if (!found.length)
        {
            MockApi.fail(422, 'We could not read any skills from that description. Try adding the tools and technologies you need.');
        }

        const skills = found.slice(0, 8).map(function (skill, index)
        {
            return {
                skill: skill,
                requirement: index < Math.ceil(found.length / 2) ? 'required' : 'preferred',
                importance: index < 2 ? 'high' : (index < 5 ? 'medium' : 'low')
            };
        });

        return { skills: skills, source: 'extracted from the job description' };
    },

    createJob(user, body)
    {
        MockApi.requireUser(user, 'recruiter');

        if (!String((body && body.title) || '').trim())
        {
            MockApi.fail(400, 'Please give the job a title.');
        }

        const state = MockStore.load();
        const job =
        {
            id: MockStore.nextId('job'),
            title: String(body.title).trim(),
            department: String(body.department || '').trim(),
            location: String(body.location || '').trim(),
            type: body.type || 'Full-time',
            salary: String(body.salary || '').trim(),
            description: String(body.description || '').trim(),
            experienceYears: Number(body.experienceYears) || 0,
            qualifications: String(body.qualifications || '').trim(),
            status: 'open',
            createdAt: new Date().toISOString(),
            skills: Array.isArray(body.skills) ? body.skills : []
        };

        state.jobs.unshift(job);
        MockStore.save();

        return MockApi.jobView(job);
    },

    updateJob(user, jobId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const job = MockApi.findJob(jobId);

        if (!job)
        {
            MockApi.fail(404, 'This job could not be found.');
        }

        const fields = ['title', 'department', 'location', 'type', 'salary', 'description', 'qualifications'];

        for (let i = 0; i < fields.length; i++)
        {
            if (body[fields[i]] !== undefined)
            {
                job[fields[i]] = String(body[fields[i]]).trim();
            }
        }

        if (body.experienceYears !== undefined)
        {
            job.experienceYears = Number(body.experienceYears) || 0;
        }

        if (Array.isArray(body.skills))
        {
            job.skills = body.skills;
        }

        MockStore.save();

        return MockApi.jobView(job);
    },

    setJobStatus(user, jobId, status)
    {
        MockApi.requireUser(user, 'recruiter');

        const job = MockApi.findJob(jobId);

        if (!job)
        {
            MockApi.fail(404, 'This job could not be found.');
        }

        job.status = status;
        MockStore.save();

        return MockApi.jobView(job);
    },

    apply(user, formData)
    {
        MockApi.requireUser(user, 'candidate');

        const jobId = Number(formData.get('jobId'));
        const file = formData.get('resume');
        const job = MockApi.findJob(jobId);

        if (!job)
        {
            MockApi.fail(404, 'This job could not be found.');
        }

        if (job.status !== 'open')
        {
            MockApi.fail(409, 'This job is closed and is no longer accepting applications.');
        }

        if (!file || !file.name)
        {
            MockApi.fail(400, 'Please choose your resume file before applying.');
        }

        if (!/\.pdf$/i.test(file.name))
        {
            MockApi.fail(400, 'Only PDF resumes are accepted. Please upload your resume as a PDF.');
        }

        if (file.size > 5 * 1024 * 1024)
        {
            MockApi.fail(413, 'That file is larger than 5 MB. Please upload a smaller PDF.');
        }

        const state = MockStore.load();
        const existing = state.applications.filter(function (application)
        {
            return application.candidateId === user.id && application.jobId === jobId;
        });

        if (existing.length)
        {
            MockApi.fail(409, 'You have already applied to ' + job.title + '.');
        }

        const now = new Date().toISOString();
        const application =
        {
            id: MockStore.nextId('application'),
            jobId: jobId,
            candidateId: user.id,
            status: 'Submitted',
            score: null,
            overrideScore: null,
            overrideReason: null,
            appliedAt: now,
            updatedAt: now,
            resumeFileName: file.name,
            score_json: null,
            history: [{ from: null, to: 'Submitted', changedBy: user.name, at: now }],
            notes: []
        };

        state.applications.push(application);

        state.notifications.push(
        {
            id: MockStore.nextId('notification'),
            userId: user.id,
            message: 'Your application for ' + job.title + ' was received.',
            createdAt: now,
            read: false
        });

        if (!state.profiles[user.id])
        {
            state.profiles[user.id] =
            {
                userId: user.id,
                name: user.name,
                email: user.email,
                phone: '',
                headline: '',
                skills: [],
                education: [],
                experience: [],
                projects: [],
                resumeFileName: file.name,
                parsedAt: now
            };
        }
        else
        {
            state.profiles[user.id].resumeFileName = file.name;
        }

        MockStore.save();

        return { application: MockApi.candidateView(application), jobTitle: job.title };
    },

    assess(user, applicationId)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);

        if (!application.score_json)
        {
            MockApi.fail(409, 'This resume has not been parsed yet, so it cannot be scored.');
        }

        Scoring.rescore(application);

        return MockApi.applicantView(application);
    },

    changeStatus(user, applicationId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);
        const target = String((body && body.status) || '').trim();
        const allowed = TRANSITIONS[application.status] || [];

        if (!target)
        {
            MockApi.fail(400, 'Please choose the status to move this application to.');
        }

        if (allowed.indexOf(target) === -1)
        {
            MockApi.fail(400, 'An application cannot move from "' + application.status + '" to "' + target + '". Allowed next steps: ' + (allowed.length ? allowed.join(', ') : 'none') + '.');
        }

        const now = new Date().toISOString();

        application.history.push({ from: application.status, to: target, changedBy: user.name, at: now });
        application.status = target;
        application.updatedAt = now;
        MockStore.save();

        return MockApi.applicantView(application);
    },

    override(user, applicationId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);
        const score = Number(body && body.score);
        const reason = String((body && body.reason) || '').trim();

        if (!Number.isFinite(score) || score < 0 || score > 100)
        {
            MockApi.fail(400, 'The override score must be a number between 0 and 100.');
        }

        if (reason.length < 10)
        {
            MockApi.fail(400, 'Please give a reason of at least 10 characters. Overrides are recorded in the audit trail.');
        }

        application.overrideScore = Math.round(score);
        application.overrideReason = reason;
        application.updatedAt = new Date().toISOString();
        MockStore.save();

        return MockApi.applicantView(application);
    },

    explain(user, applicationId)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);

        if (!application.score_json)
        {
            MockApi.fail(409, 'This application has no assessment to explain yet.');
        }

        return { applicationId: application.id, explanation: application.score_json.explanation };
    },

    learningAreas(user, applicationId)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);

        if (!application.score_json)
        {
            MockApi.fail(409, 'This application has no assessment yet.');
        }

        return { applicationId: application.id, learning_areas: application.score_json.learning_areas || [] };
    },

    patchSkills(user, applicationId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);

        if (!application.score_json)
        {
            MockApi.fail(409, 'This application has no assessment to update.');
        }

        const skillName = String((body && body.skill) || '').trim();

        if (!skillName)
        {
            MockApi.fail(400, 'Please tell us which skill to update.');
        }

        const scoreJson = application.score_json;
        let matched = null;

        for (let i = 0; i < scoreJson.matched_skills.length; i++)
        {
            if (scoreJson.matched_skills[i].skill.toLowerCase() === skillName.toLowerCase())
            {
                matched = scoreJson.matched_skills[i];
                break;
            }
        }

        let gap = null;

        for (let i = 0; i < scoreJson.gaps.length; i++)
        {
            if (scoreJson.gaps[i].skill.toLowerCase() === skillName.toLowerCase())
            {
                gap = scoreJson.gaps[i];
                break;
            }
        }

        if (body.verified !== undefined)
        {
            if (!matched)
            {
                MockApi.fail(404, 'That skill is not part of this assessment.');
            }

            matched.verified = !!body.verified;
        }
        else if (body.label !== undefined)
        {
            if (body.label !== 'no_evidence' && body.label !== 'confirmed_absent')
            {
                MockApi.fail(400, 'A gap must be labelled "no_evidence" or "confirmed_absent".');
            }

            if (gap)
            {
                gap.label = body.label;
            }
            else
            {
                scoreJson.gaps.push({ skill: skillName, label: body.label });
            }

            if (body.label === 'confirmed_absent' && matched)
            {
                scoreJson.matched_skills = scoreJson.matched_skills.filter(function (item)
                {
                    return item.skill.toLowerCase() !== skillName.toLowerCase();
                });
            }
        }
        else
        {
            MockApi.fail(400, 'Send either "verified" or "label" for the skill you want to update.');
        }

        if (!Array.isArray(scoreJson.unsupported_claims))
        {
            scoreJson.unsupported_claims = [];
        }

        if (body.reviewed !== undefined && body.claim)
        {
            for (let i = 0; i < scoreJson.unsupported_claims.length; i++)
            {
                if (scoreJson.unsupported_claims[i].claim === body.claim)
                {
                    scoreJson.unsupported_claims[i].reviewed = !!body.reviewed;
                }
            }
        }

        Scoring.rescore(application);

        return MockApi.applicantView(application);
    },

    addNote(user, applicationId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);
        const text = String((body && body.text) || '').trim();

        if (!text)
        {
            MockApi.fail(400, 'Please write a note before saving it.');
        }

        if (text.length > 1000)
        {
            MockApi.fail(400, 'Notes are limited to 1000 characters.');
        }

        const note =
        {
            id: MockStore.nextId('note'),
            text: text,
            author: user.name,
            at: new Date().toISOString()
        };

        application.notes.push(note);
        MockStore.save();

        return MockApi.clone(note);
    },

    generateQuestions(user, applicationId)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);

        if (!application.score_json)
        {
            MockApi.fail(409, 'This application has no assessment, so questions cannot be generated.');
        }

        const job = MockApi.findJob(application.jobId);
        const state = MockStore.load();
        const scoreJson = application.score_json;
        const created = [];

        const existing = state.questions.filter(function (question)
        {
            return question.applicationId === application.id;
        });

        if (existing.length)
        {
            return MockApi.clone(existing);
        }

        const matched = scoreJson.matched_skills.slice(0, 2);
        const gaps = scoreJson.gaps.slice(0, 1);
        const jobTitle = job ? job.title : 'this role';

        for (let i = 0; i < matched.length; i++)
        {
            created.push(
            {
                id: MockStore.nextId('question'),
                applicationId: application.id,
                level: i === 0 ? 'beginner' : 'intermediate',
                text: 'Describe your hands on work with ' + matched[i].skill + ' in a production setting for a ' + jobTitle + '. What did you own end to end?',
                guideline: 'Listen for specific ownership, scale and trade offs rather than a list of features. The resume claims: "' + matched[i].excerpt + '"',
                skill: matched[i].skill
            });
        }

        for (let i = 0; i < gaps.length; i++)
        {
            created.push(
            {
                id: MockStore.nextId('question'),
                applicationId: application.id,
                level: 'advanced',
                text: 'This role needs ' + gaps[i].skill + ' and your resume shows no evidence of it. How would you get productive with it in your first month?',
                guideline: 'A good answer names a concrete learning plan and transfers from adjacent technology. Do not penalise the honest gap itself; the decision stays with the recruiter.',
                skill: gaps[i].skill
            });
        }

        created.push(
        {
            id: MockStore.nextId('question'),
            applicationId: application.id,
            level: 'intermediate',
            text: 'Walk me through a decision you made on ' + jobTitle + ' work that you later had to change. What did you learn?',
            guideline: 'Looking for reflection and evidence of working with others, not a perfect answer.',
            skill: null
        });

        for (let i = 0; i < created.length; i++)
        {
            state.questions.push(created[i]);
        }

        MockStore.save();

        return MockApi.clone(created);
    },

    listQuestions(user, applicationId)
    {
        MockApi.requireUser(user, 'recruiter');
        MockApi.requireApplication(applicationId);

        return MockApi.clone(MockStore.load().questions.filter(function (question)
        {
            return question.applicationId === Number(applicationId);
        }));
    },

    findQuestion(questionId)
    {
        const questions = MockStore.load().questions;

        for (let i = 0; i < questions.length; i++)
        {
            if (questions[i].id === Number(questionId))
            {
                return questions[i];
            }
        }

        return null;
    },

    updateQuestion(user, questionId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const question = MockApi.findQuestion(questionId);

        if (!question)
        {
            MockApi.fail(404, 'This question could not be found.');
        }

        if (body.text !== undefined)
        {
            const text = String(body.text).trim();

            if (!text)
            {
                MockApi.fail(400, 'A question cannot be empty.');
            }

            question.text = text;
        }

        if (body.guideline !== undefined)
        {
            question.guideline = String(body.guideline).trim();
        }

        if (body.level !== undefined)
        {
            question.level = body.level;
        }

        MockStore.save();

        return MockApi.clone(question);
    },

    deleteQuestion(user, questionId)
    {
        MockApi.requireUser(user, 'recruiter');

        const state = MockStore.load();
        const before = state.questions.length;

        state.questions = state.questions.filter(function (question)
        {
            return question.id !== Number(questionId);
        });

        if (state.questions.length === before)
        {
            MockApi.fail(404, 'This question could not be found.');
        }

        MockStore.save();

        return { deleted: Number(questionId) };
    },

    regenerateQuestion(user, questionId)
    {
        MockApi.requireUser(user, 'recruiter');

        const question = MockApi.findQuestion(questionId);

        if (!question)
        {
            MockApi.fail(404, 'This question could not be found.');
        }

        const application = MockApi.findApplication(question.applicationId);
        const job = application ? MockApi.findJob(application.jobId) : null;
        const jobTitle = job ? job.title : 'this role';
        const focus = question.skill ? question.skill : jobTitle;

        const variants = [
            'What was the hardest problem you solved using ' + focus + ', and how did you know your solution was right?',
            'If you joined as a ' + jobTitle + ', what would you do with ' + focus + ' in your first two weeks?',
            'Explain a trade off you made involving ' + focus + '. What did you give up and what did you gain?'
        ];

        question.text = variants[Math.floor(Math.random() * variants.length)];
        MockStore.save();

        return MockApi.clone(question);
    },

    overlaps(startA, minutesA, startB, minutesB)
    {
        const a1 = new Date(startA).getTime();
        const a2 = a1 + (Number(minutesA) || 0) * 60000;
        const b1 = new Date(startB).getTime();
        const b2 = b1 + (Number(minutesB) || 0) * 60000;
        return a1 < b2 && b1 < a2;
    },

    findConflicts(payload, ignoreId)
    {
        const interviews = MockStore.load().interviews;
        const conflicts = [];

        for (let i = 0; i < interviews.length; i++)
        {
            const existing = interviews[i];

            if (existing.status === 'cancelled' || existing.id === Number(ignoreId))
            {
                continue;
            }

            if (!MockApi.overlaps(payload.scheduled_at, payload.duration_minutes, existing.scheduled_at, existing.duration_minutes))
            {
                continue;
            }

            if (existing.interviewer === payload.interviewer)
            {
                conflicts.push({ type: 'interviewer', name: existing.interviewer, scheduled_at: existing.scheduled_at, duration_minutes: existing.duration_minutes, with: existing.candidateName });
            }

            if (existing.applicationId === Number(payload.application_id))
            {
                conflicts.push({ type: 'candidate', name: existing.candidateName, scheduled_at: existing.scheduled_at, duration_minutes: existing.duration_minutes, with: existing.interviewer });
            }
        }

        return conflicts;
    },

    createInterview(user, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(body.application_id);
        const interviewer = String(body.interviewer || '').trim();
        const scheduledAt = body.scheduled_at;
        const duration = Number(body.duration_minutes) || 45;

        if (!interviewer)
        {
            MockApi.fail(400, 'Please choose who will run the interview.');
        }

        if (!scheduledAt || isNaN(new Date(scheduledAt).getTime()))
        {
            MockApi.fail(400, 'Please pick a valid date and time for the interview.');
        }

        if (duration < 15 || duration > 240)
        {
            MockApi.fail(400, 'Interview length must be between 15 and 240 minutes.');
        }

        const payload =
        {
            application_id: application.id,
            interviewer: interviewer,
            scheduled_at: new Date(scheduledAt).toISOString(),
            duration_minutes: duration
        };

        const conflicts = MockApi.findConflicts(payload, null);

        if (conflicts.length && !body.force)
        {
            MockApi.fail(409, 'This slot clashes with an existing interview. Review the clash and schedule anyway if it is intentional.');
        }

        const candidate = MockApi.findUser(application.candidateId) || {};
        const job = MockApi.findJob(application.jobId);
        const state = MockStore.load();

        const interview =
        {
            id: MockStore.nextId('interview'),
            applicationId: application.id,
            jobId: application.jobId,
            candidateId: application.candidateId,
            candidateName: candidate.name || 'Unknown candidate',
            jobTitle: job ? job.title : 'Unknown role',
            interviewer: interviewer,
            interview_type: body.interview_type || 'technical',
            scheduled_at: payload.scheduled_at,
            duration_minutes: duration,
            status: 'scheduled',
            feedback: null,
            createdAt: new Date().toISOString(),
            conflicts: conflicts
        };

        state.interviews.push(interview);

        if (application.status === 'Shortlisted')
        {
            application.history.push({ from: application.status, to: 'Interview', changedBy: user.name, at: interview.createdAt });
            application.status = 'Interview';
            application.updatedAt = interview.createdAt;
        }

        state.notifications.push(
        {
            id: MockStore.nextId('notification'),
            userId: application.candidateId,
            message: 'An interview for ' + interview.jobTitle + ' has been scheduled. We will be in touch with the details.',
            createdAt: interview.createdAt,
            read: false
        });

        MockStore.save();

        return { interview: MockApi.clone(interview), conflicts: conflicts };
    },

    listInterviews(user)
    {
        MockApi.requireUser(user, 'recruiter');

        const interviews = MockStore.load().interviews
            .filter(function (interview) { return interview.status !== 'cancelled'; })
            .slice()
            .sort(function (a, b) { return new Date(a.scheduled_at) - new Date(b.scheduled_at); });

        return MockApi.clone(interviews);
    },

    updateInterview(user, interviewId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const state = MockStore.load();
        let interview = null;

        for (let i = 0; i < state.interviews.length; i++)
        {
            if (state.interviews[i].id === Number(interviewId))
            {
                interview = state.interviews[i];
                break;
            }
        }

        if (!interview)
        {
            MockApi.fail(404, 'This interview could not be found.');
        }

        const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at).toISOString() : interview.scheduled_at;
        const duration = Number(body.duration_minutes) || interview.duration_minutes;
        const interviewer = String(body.interviewer || interview.interviewer).trim();

        const conflicts = MockApi.findConflicts(
        {
            application_id: interview.applicationId,
            interviewer: interviewer,
            scheduled_at: scheduledAt,
            duration_minutes: duration
        }, interview.id);

        if (conflicts.length && !body.force)
        {
            MockApi.fail(409, 'The new slot clashes with an existing interview. Review the clash and reschedule anyway if it is intentional.');
        }

        interview.interviewer = interviewer;
        interview.scheduled_at = scheduledAt;
        interview.duration_minutes = duration;

        if (body.interview_type)
        {
            interview.interview_type = body.interview_type;
        }

        interview.conflicts = conflicts;
        MockStore.save();

        return { interview: MockApi.clone(interview), conflicts: conflicts };
    },

    saveFeedback(user, interviewId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const state = MockStore.load();
        let interview = null;

        for (let i = 0; i < state.interviews.length; i++)
        {
            if (state.interviews[i].id === Number(interviewId))
            {
                interview = state.interviews[i];
                break;
            }
        }

        if (!interview)
        {
            MockApi.fail(404, 'This interview could not be found.');
        }

        const criteria = ['technical', 'communication', 'problem_solving', 'culture_fit'];
        const feedback = {};

        for (let i = 0; i < criteria.length; i++)
        {
            const value = Number(body[criteria[i]]);

            if (!Number.isFinite(value) || value < 1 || value > 5)
            {
                MockApi.fail(400, 'Please rate ' + criteria[i].replace('_', ' ') + ' from 1 to 5.');
            }

            feedback[criteria[i]] = Math.round(value);
        }

        if (['hire', 'hold', 'reject'].indexOf(body.recommendation) === -1)
        {
            MockApi.fail(400, 'Please choose a recommendation: hire, hold or reject.');
        }

        feedback.comments = String(body.comments || '').trim();
        feedback.recommendation = body.recommendation;
        feedback.submittedBy = user.name;
        feedback.submittedAt = new Date().toISOString();

        interview.feedback = feedback;
        interview.status = 'completed';
        MockStore.save();

        return MockApi.clone(interview);
    },

    decide(user, applicationId, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);
        const decision = body && body.decision;
        const reason = String((body && body.reason) || '').trim();

        if (['Selected', 'Rejected'].indexOf(decision) === -1)
        {
            MockApi.fail(400, 'A final decision must be "Selected" or "Rejected".');
        }

        if (!reason)
        {
            MockApi.fail(400, 'Please give a reason for the final decision. The candidate is notified and the decision is audited.');
        }

        const allowed = TRANSITIONS[application.status] || [];

        if (allowed.indexOf(decision) === -1)
        {
            MockApi.fail(400, 'A final decision cannot be recorded from "' + application.status + '". Allowed next steps: ' + (allowed.length ? allowed.join(', ') : 'none') + '.');
        }

        const state = MockStore.load();
        const now = new Date().toISOString();
        const job = MockApi.findJob(application.jobId);
        const jobTitle = job ? job.title : 'the role';

        application.history.push({ from: application.status, to: decision, changedBy: user.name, at: now, reason: reason });
        application.status = decision;
        application.updatedAt = now;

        const message = decision === 'Selected'
            ? 'Good news. Your application for ' + jobTitle + ' was successful. Our team will contact you with next steps.'
            : 'Thank you for applying to ' + jobTitle + '. After careful review we will not be moving forward on this occasion.';

        state.notifications.push({ id: MockStore.nextId('notification'), userId: application.candidateId, message: message, createdAt: now, read: false });

        console.log('[notification] to user ' + application.candidateId + ': ' + message);

        MockStore.save();

        return { application: MockApi.applicantView(application), notification: message };
    },

    talentSearch(user, body)
    {
        MockApi.requireUser(user, 'recruiter');

        const query = String((body && body.query) || '').trim();

        if (query.length < 2)
        {
            MockApi.fail(400, 'Please describe the talent you are looking for in at least 2 characters.');
        }

        const terms = query.toLowerCase().split(/[^a-z0-9+#.]+/).filter(function (term) { return term.length > 1; });
        const state = MockStore.load();
        const results = [];

        for (let i = 0; i < state.applications.length; i++)
        {
            const application = state.applications[i];

            if (!application.score_json)
            {
                continue;
            }

            const profile = state.profiles[application.candidateId] || { skills: [] };
            const haystack = [];

            for (let j = 0; j < application.score_json.matched_skills.length; j++)
            {
                const matched = application.score_json.matched_skills[j];
                haystack.push({ skill: matched.skill, excerpt: matched.excerpt });
            }

            for (let j = 0; j < profile.skills.length; j++)
            {
                haystack.push({ skill: profile.skills[j].skill, excerpt: null });
            }

            let hits = 0;
            const excerpts = [];

            for (let j = 0; j < terms.length; j++)
            {
                let matchedTerm = false;

                for (let k = 0; k < haystack.length; k++)
                {
                    if (haystack[k].skill.toLowerCase().indexOf(terms[j]) !== -1)
                    {
                        matchedTerm = true;

                        if (haystack[k].excerpt)
                        {
                            excerpts.push({ skill: haystack[k].skill, excerpt: haystack[k].excerpt, term: terms[j] });
                        }
                        else
                        {
                            excerpts.push({ skill: haystack[k].skill, excerpt: 'Listed under skills on the parsed resume.', term: terms[j] });
                        }
                        break;
                    }
                }

                if (matchedTerm)
                {
                    hits++;
                }
            }

            if (!hits)
            {
                continue;
            }

            const candidate = MockApi.findUser(application.candidateId) || {};
            const job = MockApi.findJob(application.jobId);

            results.push(
            {
                applicationId: application.id,
                candidateId: application.candidateId,
                candidateName: candidate.name || 'Unknown candidate',
                jobId: application.jobId,
                jobTitle: job ? job.title : 'Unknown role',
                score: application.overrideScore === null ? application.score : application.overrideScore,
                status: application.status,
                similarity: Math.round(hits / terms.length * 100) / 100,
                excerpts: excerpts.slice(0, 3)
            });
        }

        results.sort(function (a, b)
        {
            return b.similarity - a.similarity || b.score - a.score;
        });

        return { query: query, count: results.length, results: results };
    },

    compare(user, ids)
    {
        MockApi.requireUser(user, 'recruiter');

        const list = String(ids || '').split(',').map(function (part) { return Number(part.trim()); }).filter(function (id) { return id > 0; });

        if (list.length < 2)
        {
            MockApi.fail(400, 'Select at least 2 applicants to compare.');
        }

        if (list.length > 3)
        {
            MockApi.fail(400, 'You can compare up to 3 applicants at a time.');
        }

        const state = MockStore.load();
        const applicants = [];

        for (let i = 0; i < list.length; i++)
        {
            const application = MockApi.findApplication(list[i]);

            if (!application)
            {
                MockApi.fail(404, 'Applicant ' + list[i] + ' could not be found.');
            }

            applicants.push(MockApi.applicantView(application));
        }

        const skillSets = applicants.map(function (applicant)
        {
            return (applicant.score_json && applicant.score_json.matched_skills || []).map(function (matched)
            {
                return matched.skill.toLowerCase();
            });
        });

        const missing = [];

        for (let i = 0; i < applicants.length; i++)
        {
            const others = [];

            for (let j = 0; j < skillSets.length; j++)
            {
                if (j !== i)
                {
                    others.push(skillSets[j]);
                }
            }

            const onlyHere = [];

            for (let j = 0; j < skillSets[i].length; j++)
            {
                const skill = skillSets[i][j];
                const inAllOthers = others.every(function (set) { return set.indexOf(skill) !== -1; });

                if (!inAllOthers)
                {
                    onlyHere.push(skill);
                }
            }

            missing.push({ applicantId: applicants[i].id, candidateName: applicants[i].candidateName, unique_skills: onlyHere });
        }

        return { applicants: applicants, missing_information: missing };
    },

    fairnessTest(user, applicationId)
    {
        MockApi.requireUser(user, 'recruiter');

        const application = MockApi.requireApplication(applicationId);

        if (!application.score_json)
        {
            MockApi.fail(409, 'This application has no assessment to test.');
        }

        const original = application.overrideScore === null ? application.score : application.overrideScore;

        return {
            applicationId: application.id,
            original_score: original,
            anonymised_score: original,
            difference: 0,
            unchanged: true,
            protected_attributes_excluded: ['age', 'gender', 'ethnicity', 'religion', 'marital status', 'disability', 'photograph', 'home address'],
            note: 'The assessment was re-run with every protected attribute removed from the resume text. The score did not change.'
        };
    },

    analytics(user)
    {
        MockApi.requireUser(user, 'recruiter');

        const state = MockStore.load();
        const applications = state.applications;

        const byJob = {};
        const byStage = {};

        for (let i = 0; i < state.jobs.length; i++)
        {
            byJob[state.jobs[i].title] = 0;
        }

        for (let i = 0; i < applications.length; i++)
        {
            const job = MockApi.findJob(applications[i].jobId);
            const title = job ? job.title : 'Unknown role';
            byJob[title] = (byJob[title] || 0) + 1;
            byStage[applications[i].status] = (byStage[applications[i].status] || 0) + 1;
        }

        const shortlisted = applications.filter(function (application)
        {
            return ['Shortlisted', 'Interview', 'Selected'].indexOf(application.status) !== -1;
        }).length;

        const decided = applications.filter(function (application)
        {
            return application.history.some(function (entry)
            {
                return ['Shortlisted', 'Rejected'].indexOf(entry.to) !== -1;
            });
        }).length;

        let totalDays = 0;
        let measured = 0;

        for (let i = 0; i < applications.length; i++)
        {
            const history = applications[i].history;
            const submitted = history[0];
            let firstDecision = null;

            for (let j = 0; j < history.length; j++)
            {
                if (['Shortlisted', 'Rejected'].indexOf(history[j].to) !== -1 && history[j].changedBy !== 'system')
                {
                    firstDecision = history[j];
                    break;
                }
            }

            if (submitted && firstDecision)
            {
                totalDays += (new Date(firstDecision.at) - new Date(submitted.at)) / 86400000;
                measured++;
            }
        }

        const gapCounts = {};

        for (let i = 0; i < applications.length; i++)
        {
            const gaps = (applications[i].score_json && applications[i].score_json.gaps) || [];

            for (let j = 0; j < gaps.length; j++)
            {
                gapCounts[gaps[j].skill] = (gapCounts[gaps[j].skill] || 0) + 1;
            }
        }

        const upcoming = state.interviews.filter(function (interview)
        {
            return interview.status === 'scheduled' && new Date(interview.scheduled_at).getTime() >= Date.now() - 86400000;
        }).length;

        const scored = applications.filter(function (application) { return application.score !== null && application.score !== undefined; });
        const effective = function (application) { return application.overrideScore === null ? application.score : application.overrideScore; };
        const average = function (list)
        {
            return list.length ? Math.round(list.reduce(function (sum, value) { return sum + value; }, 0) / list.length) : 0;
        };
        const scores = scored.map(effective);
        const band = function (low, high) { return scores.filter(function (value) { return value >= low && value <= high; }).length; };

        const tally = function (pick)
        {
            const counts = {};
            const labels = {};

            applications.forEach(function (application)
            {
                const seen = {};

                pick(application).forEach(function (name)
                {
                    const key = String(name).toLowerCase();

                    if (!seen[key])
                    {
                        seen[key] = true;
                        counts[key] = (counts[key] || 0) + 1;
                        labels[key] = labels[key] || name;
                    }
                });
            });

            return Object.keys(counts)
                .map(function (key) { return { skill: labels[key], count: counts[key] }; })
                .sort(function (a, b) { return b.count - a.count; })
                .slice(0, 6);
        };

        return {
            totals:
            {
                jobs: state.jobs.length,
                applicants: applications.length,
                shortlisted: shortlisted,
                selected: applications.filter(function (application) { return application.status === 'Selected'; }).length,
                averageScore: average(scores)
            },
            funnel: Object.keys(TRANSITIONS).map(function (status) { return { status: status, count: byStage[status] || 0 }; }),
            distribution:
            [
                { label: '0-39', count: band(0, 39) },
                { label: '40-59', count: band(40, 59) },
                { label: '60-79', count: band(60, 79) },
                { label: '80-100', count: band(80, 100) }
            ],
            topSkills: tally(function (application)
            {
                return ((application.score_json && application.score_json.matched_skills) || []).map(function (item) { return item.skill; });
            }),
            topGaps: tally(function (application)
            {
                return ((application.score_json && application.score_json.gaps) || []).map(function (item) { return item.skill; });
            }),
            byJob: state.jobs.map(function (job)
            {
                const mine = scored.filter(function (application) { return application.jobId === job.id; });
                return { title: job.title, applicants: MockApi.applicantCount(job.id), averageScore: average(mine.map(effective)) };
            }),
            active_jobs: state.jobs.filter(function (job) { return job.status === 'open'; }).length,
            total_applications: applications.length,
            shortlisted_count: shortlisted,
            pending_reviews: applications.filter(function (application) { return REVIEW_STATES.indexOf(application.status) !== -1; }).length,
            upcoming_interviews: upcoming,
            applications_by_job: Object.keys(byJob).map(function (title) { return { job: title, count: byJob[title] }; }),
            applications_by_stage: Object.keys(byStage).map(function (status) { return { status: status, count: byStage[status] }; }),
            shortlist_rate: decided ? Math.round(shortlisted / decided * 100) : 0,
            avg_processing_time: measured ? Math.round(totalDays / measured * 10) / 10 : 0,
            common_skill_gaps: Object.keys(gapCounts)
                .map(function (skill) { return { skill: skill, count: gapCounts[skill] }; })
                .sort(function (a, b) { return b.count - a.count; })
                .slice(0, 10)
        };
    },

    getProfile(user)
    {
        MockApi.requireUser(user, 'candidate');

        const state = MockStore.load();
        const profile = state.profiles[user.id];

        if (!profile)
        {
            return { userId: user.id, name: user.name, email: user.email, phone: '', headline: '', skills: [], education: [], experience: [], projects: [], resumeFileName: null, parsedAt: null };
        }

        return MockApi.clone(profile);
    },

    saveProfile(user, body)
    {
        MockApi.requireUser(user, 'candidate');

        const state = MockStore.load();
        const profile = state.profiles[user.id] || { userId: user.id, skills: [], education: [], experience: [], projects: [] };

        if (body.phone !== undefined)
        {
            profile.phone = String(body.phone).trim();
        }

        if (body.headline !== undefined)
        {
            profile.headline = String(body.headline).trim();
        }

        if (Array.isArray(body.skills))
        {
            profile.skills = body.skills.map(function (skill)
            {
                return { skill: String(skill.skill || '').trim(), verified: skill.verified !== false };
            }).filter(function (skill) { return skill.skill.length > 0; });
        }

        if (Array.isArray(body.education))
        {
            profile.education = body.education;
        }

        if (Array.isArray(body.experience))
        {
            profile.experience = body.experience;
        }

        if (Array.isArray(body.projects))
        {
            profile.projects = body.projects;
        }

        profile.name = user.name;
        profile.email = user.email;
        profile.corrections = (profile.corrections || 0) + 1;
        profile.correctedAt = new Date().toISOString();
        state.profiles[user.id] = profile;
        MockStore.save();

        return MockApi.clone(profile);
    },

    candidateApplications(user)
    {
        MockApi.requireUser(user, 'candidate');

        return MockStore.load().applications
            .filter(function (application) { return application.candidateId === user.id; })
            .map(function (application) { return MockApi.candidateView(application); })
            .sort(function (a, b) { return new Date(b.appliedAt) - new Date(a.appliedAt); });
    },

    candidateInterviews(user)
    {
        MockApi.requireUser(user, 'candidate');

        return MockApi.clone(MockStore.load().interviews
            .filter(function (interview) { return interview.candidateId === user.id && interview.status !== 'cancelled'; })
            .sort(function (a, b) { return new Date(a.scheduled_at) - new Date(b.scheduled_at); }));
    },

    notifications(user)
    {
        if (!user)
        {
            MockApi.fail(401, 'Please log in to continue.');
        }

        if (user.role !== 'candidate')
        {
            return [];
        }

        return MockApi.clone(MockStore.load().notifications
            .filter(function (note) { return note.userId === user.id; })
            .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }));
    },

    markNotificationsRead(user)
    {
        MockApi.requireUser(user, 'candidate');

        const state = MockStore.load();

        for (let i = 0; i < state.notifications.length; i++)
        {
            if (state.notifications[i].userId === user.id)
            {
                state.notifications[i].read = true;
            }
        }

        MockStore.save();

        return MockApi.notifications(user);
    },

    async handle(method, path, body, token)
    {
        await new Promise(function (resolve)
        {
            setTimeout(resolve, 220);
        });

        const state = MockStore.load();
        const route = path.split('?')[0];
        const query = new URLSearchParams(path.split('?')[1] || '');
        const user = MockApi.userFromToken(token);
        let match = null;

        if (method === 'POST' && route === '/api/auth/login')
        {
            return MockApi.login(body);
        }

        if (method === 'POST' && route === '/api/auth/register')
        {
            return MockApi.register(body);
        }

        if (method === 'POST' && route === '/api/auth/logout')
        {
            return { message: 'Logged out' };
        }

        if (method === 'POST' && route === '/api/mock/reset')
        {
            MockStore.reset();
            return { message: 'Demo data restored.' };
        }

        if (method === 'GET' && route === '/api/jobs')
        {
            MockApi.requireUser(user, 'recruiter');
            return state.jobs.map(function (job) { return MockApi.jobView(job); });
        }

        if (method === 'GET' && route === '/api/jobs/open')
        {
            MockApi.requireUser(user);

            return state.jobs.filter(function (job)
            {
                return job.status === 'open';
            }).map(function (job) { return MockApi.jobView(job); });
        }

        if (method === 'POST' && route === '/api/jobs')
        {
            return MockApi.createJob(user, body);
        }

        if (method === 'POST' && route === '/api/jobs/extract-requirements')
        {
            MockApi.requireUser(user, 'recruiter');
            return MockApi.extractRequirements(body);
        }

        match = route.match(/^\/api\/jobs\/(\d+)\/close$/);

        if (method === 'PATCH' && match)
        {
            return MockApi.setJobStatus(user, match[1], 'closed');
        }

        match = route.match(/^\/api\/jobs\/(\d+)\/reopen$/);

        if (method === 'PATCH' && match)
        {
            return MockApi.setJobStatus(user, match[1], 'open');
        }

        match = route.match(/^\/api\/jobs\/(\d+)\/applicants$/);

        if (method === 'GET' && match)
        {
            MockApi.requireUser(user, 'recruiter');

            const jobId = Number(match[1]);

            if (!MockApi.findJob(jobId))
            {
                MockApi.fail(404, 'This job could not be found.');
            }

            return state.applications
                .filter(function (application) { return application.jobId === jobId; })
                .map(function (application) { return MockApi.applicantView(application); })
                .sort(function (a, b) { return (b.effectiveScore || 0) - (a.effectiveScore || 0); });
        }

        match = route.match(/^\/api\/jobs\/(\d+)$/);

        if (method === 'GET' && match)
        {
            MockApi.requireUser(user);

            const job = MockApi.findJob(match[1]);

            if (!job)
            {
                MockApi.fail(404, 'This job could not be found.');
            }

            return MockApi.jobView(job);
        }

        match = route.match(/^\/api\/jobs\/(\d+)$/);

        if (method === 'PUT' && match)
        {
            return MockApi.updateJob(user, match[1], body);
        }

        if (method === 'POST' && route === '/api/applications')
        {
            if (!(body instanceof FormData))
            {
                MockApi.fail(400, 'Please upload your resume as a PDF file.');
            }

            return MockApi.apply(user, body);
        }

        match = route.match(/^\/api\/applications\/(\d+)$/);

        if (method === 'GET' && match)
        {
            MockApi.requireUser(user, 'recruiter');
            return MockApi.applicantView(MockApi.requireApplication(match[1]));
        }

        match = route.match(/^\/api\/applications\/(\d+)\/assess$/);

        if (method === 'POST' && match)
        {
            return MockApi.assess(user, match[1]);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/override$/);

        if (method === 'PATCH' && match)
        {
            return MockApi.override(user, match[1], body);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/explain$/);

        if (method === 'POST' && match)
        {
            return MockApi.explain(user, match[1]);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/learning-areas$/);

        if (method === 'POST' && match)
        {
            return MockApi.learningAreas(user, match[1]);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/skills$/);

        if (method === 'PATCH' && match)
        {
            return MockApi.patchSkills(user, match[1], body);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/status$/);

        if (method === 'PATCH' && match)
        {
            return MockApi.changeStatus(user, match[1], body);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/notes$/);

        if (method === 'GET' && match)
        {
            MockApi.requireUser(user, 'recruiter');
            return MockApi.clone(MockApi.requireApplication(match[1]).notes);
        }

        if (method === 'POST' && match)
        {
            return MockApi.addNote(user, match[1], body);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/history$/);

        if (method === 'GET' && match)
        {
            MockApi.requireUser(user, 'recruiter');
            return MockApi.clone(MockApi.requireApplication(match[1]).history);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/questions\/generate$/);

        if (method === 'POST' && match)
        {
            return MockApi.generateQuestions(user, match[1]);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/questions$/);

        if (method === 'GET' && match)
        {
            return MockApi.listQuestions(user, match[1]);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/fairness-test$/);

        if (method === 'POST' && match)
        {
            return MockApi.fairnessTest(user, match[1]);
        }

        match = route.match(/^\/api\/applications\/(\d+)\/decision$/);

        if (method === 'POST' && match)
        {
            return MockApi.decide(user, match[1], body);
        }

        match = route.match(/^\/api\/questions\/(\d+)\/regenerate$/);

        if (method === 'POST' && match)
        {
            return MockApi.regenerateQuestion(user, match[1]);
        }

        match = route.match(/^\/api\/questions\/(\d+)$/);

        if (method === 'PUT' && match)
        {
            return MockApi.updateQuestion(user, match[1], body);
        }

        if (method === 'DELETE' && match)
        {
            return MockApi.deleteQuestion(user, match[1]);
        }

        if (method === 'POST' && route === '/api/interviews')
        {
            return MockApi.createInterview(user, body);
        }

        if (method === 'GET' && route === '/api/interviews')
        {
            return MockApi.listInterviews(user);
        }

        match = route.match(/^\/api\/interviews\/(\d+)\/feedback$/);

        if (method === 'POST' && match)
        {
            return MockApi.saveFeedback(user, match[1], body);
        }

        match = route.match(/^\/api\/interviews\/(\d+)$/);

        if (method === 'PUT' && match)
        {
            return MockApi.updateInterview(user, match[1], body);
        }

        if (method === 'GET' && route === '/api/analytics')
        {
            return MockApi.analytics(user);
        }

        if (method === 'POST' && route === '/api/talent/search')
        {
            return MockApi.talentSearch(user, body);
        }

        if (method === 'GET' && route === '/api/compare')
        {
            return MockApi.compare(user, query.get('ids'));
        }

        if (method === 'GET' && route === '/api/candidate/profile')
        {
            return MockApi.getProfile(user);
        }

        if (method === 'PUT' && route === '/api/candidate/profile')
        {
            return MockApi.saveProfile(user, body);
        }

        if (method === 'GET' && route === '/api/candidate/applications')
        {
            return MockApi.candidateApplications(user);
        }

        if (method === 'GET' && route === '/api/candidate/recommendations')
        {
            MockApi.requireUser(user, 'candidate');
            return [];
        }

        if (method === 'GET' && route === '/api/candidate/interviews')
        {
            return MockApi.candidateInterviews(user);
        }

        if (method === 'GET' && route === '/api/notifications')
        {
            return MockApi.notifications(user);
        }

        if (method === 'PATCH' && route === '/api/notifications/read')
        {
            return MockApi.markNotificationsRead(user);
        }

        MockApi.fail(404, 'This feature is not available in demo mode yet.');
    }
};