import { subDays } from "date-fns";

export type CuratedJobSeed = {
  externalId: string;
  company: {
    name: string;
    websiteUrl: string;
    logoUrl?: string;
    industry?: string;
    location?: string;
    size?: string;
    description?: string;
  };
  job: {
    title: string;
    location: string;
    jobType?: string;
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    description: string;
    requirements?: string[];
    responsibilities?: string[];
    benefits?: string[];
    applicationUrl: string;
    postedDate: string;
    source: "curated" | "dummy";
  };
};

const now = new Date();

export const curatedJobSeeds: CuratedJobSeed[] = [
  {
    externalId: "curated-google-frontend-001",
    company: {
      name: "Google",
      websiteUrl: "https://careers.google.com/jobs/results/",
      logoUrl: "https://logo.clearbit.com/google.com",
      industry: "Technology",
      location: "Mountain View, CA",
      size: "10,000+ employees",
      description:
        "Google builds products that help create opportunities for everyone, whether down the street or across the globe.",
    },
    job: {
      title: "Senior Frontend Engineer, Search Experience",
      location: "Mountain View, CA (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Senior",
      salaryMin: 190000,
      salaryMax: 250000,
      salaryCurrency: "USD",
      description:
        `<p>As a Senior Frontend Engineer on the Search team you will craft intuitive, inclusive, and performant interfaces that help billions of people surface answers faster. You will partner with UX, product, and ML teams to design experiments, interpret signals, and release polished features at scale.</p>
         <p>The ideal candidate thrives in highly collaborative environments, is comfortable working with large codebases, and has a passion for pushing the boundaries of what modern web platforms can do.</p>`,
      requirements: [
        "8+ years of experience building production web applications",
        "Expert knowledge of TypeScript, React, and modern build pipelines",
        "Track record leading end-to-end feature delivery in high-growth products",
        "Experience with A/B experimentation and data-informed UX decisions",
        "Comfortable partnering with cross-functional stakeholders",
      ],
      responsibilities: [
        "Lead design and implementation of critical user-facing Search features",
        "Mentor engineers on accessibility, performance, and testing best practices",
        "Develop reusable UI primitives and tooling that unlock rapid experimentation",
        "Collaborate with product and UX to translate user insights into delightful experiences",
        "Continuously improve monitoring, observability, and release safety",
      ],
      benefits: [
        "Equity and performance bonus",
        "401(k) with company match",
        "Comprehensive medical, dental, and vision coverage",
        "Generous parental leave and caregiving support",
        "Onsite meals, fitness centers, and commuter programs",
      ],
      applicationUrl: "https://careers.google.com/jobs/results/",
      postedDate: subDays(now, 6).toISOString(),
      source: "curated",
    },
  },
  {
    externalId: "curated-microsoft-cloud-002",
    company: {
      name: "Microsoft",
      websiteUrl: "https://careers.microsoft.com/",
      logoUrl: "https://logo.clearbit.com/microsoft.com",
      industry: "Technology",
      location: "Redmond, WA",
      size: "10,000+ employees",
      description:
        "Microsoft empowers every person and every organization on the planet to achieve more through cloud-first, AI-driven solutions.",
    },
    job: {
      title: "Principal Software Engineer, Azure Reliability",
      location: "Redmond, WA (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Principal",
      salaryMin: 210000,
      salaryMax: 260000,
      salaryCurrency: "USD",
      description:
        `<p>Join the Azure Reliability Engineering group to architect resilient distributed systems that power mission-critical workloads. You will drive technical strategy, design self-healing primitives, and coach teams shipping services used by millions.</p>
         <p>This role blends deep technical leadership with hands-on development to ensure Azure meets world-class SLOs.</p>`,
      requirements: [
        "10+ years building distributed systems or large-scale services",
        "Hands-on expertise with C#, Go, or Rust",
        "Strong background in observability, chaos engineering, and incident response",
        "Experience guiding teams through modernization or cloud migrations",
        "Excellent communication skills and executive presence",
      ],
      responsibilities: [
        "Shape reliability architecture for high-availability Azure services",
        "Lead cross-org initiatives to improve SLO adherence and incident response",
        "Design automation that prevents regressions and reduces operational toil",
        "Mentor engineers and influence engineering culture across Azure",
        "Represent the team in technical reviews and executive briefings",
      ],
      benefits: [
        "Industry-leading healthcare and wellness programs",
        "Employee stock purchase plan and RSUs",
        "Tuition reimbursement and learning stipends",
        "Generous vacation plus company holidays",
        "Hybrid work with modern collaboration hubs",
      ],
      applicationUrl: "https://careers.microsoft.com/professionals",
      postedDate: subDays(now, 9).toISOString(),
      source: "curated",
    },
  },
  {
    externalId: "curated-amazon-ml-003",
    company: {
      name: "Amazon",
      websiteUrl: "https://www.amazon.jobs/en/",
      logoUrl: "https://logo.clearbit.com/amazon.com",
      industry: "E-commerce",
      location: "Seattle, WA",
      size: "10,000+ employees",
      description:
        "Amazon is driven by the mission to be Earth's most customer-centric company and leverages AI to delight shoppers worldwide.",
    },
    job: {
      title: "Applied Scientist II, Personalization",
      location: "Seattle, WA (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Mid-Senior",
      salaryMin: 175000,
      salaryMax: 220000,
      salaryCurrency: "USD",
      description:
        `<p>The Personalization organization invents algorithms that power Amazon's home page, product recommendations, and marketing channels. Applied Scientists partner with product and engineering teams to design models that surface relevant content for hundreds of millions of customers.</p>
         <p>In this role you will launch novel ML techniques, evaluate performance rigorously, and ship experimentation frameworks at planet scale.</p>`,
      requirements: [
        "MS or PhD in CS, ML, or related field",
        "3+ years of experience building production machine learning models",
        "Fluency with Python, PyTorch/TensorFlow, and AWS services",
        "Experience with large-scale experimentation and offline evaluation",
        "Excellent stakeholder management and communication skills",
      ],
      responsibilities: [
        "Design and deploy recommendation models that improve shopper engagement",
        "Analyze large datasets to uncover actionable insights and feature opportunities",
        "Collaborate with engineers to productionize models and monitor performance",
        "Conduct rigorous A/B tests and publish learnings across Amazon",
        "Champion responsible AI practices and bias mitigation",
      ],
      benefits: [
        "Sign-on bonus and restricted stock units",
        "Comprehensive medical, dental, and vision plans",
        "Paid parental leave and family support services",
        "Employee discount and commuter benefits",
        "Opportunities for internal mobility across Amazon",
      ],
      applicationUrl: "https://www.amazon.jobs/en/business_categories/amazon-web-services",
      postedDate: subDays(now, 12).toISOString(),
      source: "curated",
    },
  },
  {
    externalId: "curated-netflix-data-004",
    company: {
      name: "Netflix",
      websiteUrl: "https://jobs.netflix.com/",
      logoUrl: "https://logo.clearbit.com/netflix.com",
      industry: "Entertainment",
      location: "Los Gatos, CA",
      size: "10,000+ employees",
      description:
        "Netflix builds the world's leading streaming entertainment service and creates original content for global audiences.",
    },
    job: {
      title: "Senior Data Scientist, Content Analytics",
      location: "Los Gatos, CA (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Senior",
      salaryMin: 200000,
      salaryMax: 320000,
      salaryCurrency: "USD",
      description:
        `<p>Content Analytics partners with creative, production, and finance teams to answer high-impact questions about what to produce and how to launch it globally. You will lead strategic analyses, build forecasting models, and advise executives using compelling storytelling backed by data.</p>
         <p>Success looks like clear frameworks for greenlighting titles and insights that improve member joy.</p>`,
      requirements: [
        "8+ years in data science, analytics, or strategy",
        "Expert SQL and proficiency with Python/R",
        "Experience influencing senior leaders with data narratives",
        "Comfortable framing ambiguous problems and testing hypotheses",
        "Knowledge of media, entertainment, or subscription businesses",
      ],
      responsibilities: [
        "Own analytics roadmap for a portfolio of originals",
        "Develop models forecasting title performance and member retention",
        "Deliver scenario analysis to guide investment decisions",
        "Partner with experimentation teams to measure marketing impact",
        "Mentor data scientists and contribute to team-wide standards",
      ],
      benefits: [
        "Netflix culture of freedom and responsibility",
        "Highly competitive compensation and stock options",
        "Family-forming and fertility benefits",
        "Comprehensive health coverage and mental wellness support",
        "Flexible vacation policy",
      ],
      applicationUrl: "https://jobs.netflix.com/teams/data-science-and-engineering",
      postedDate: subDays(now, 18).toISOString(),
      source: "curated",
    },
  },
  {
    externalId: "curated-adobe-design-005",
    company: {
      name: "Adobe",
      websiteUrl: "https://careers.adobe.com/",
      logoUrl: "https://logo.clearbit.com/adobe.com",
      industry: "Technology",
      location: "San Jose, CA",
      size: "10,000+ employees",
      description:
        "Adobe is the global leader in digital experiences, empowering everyone from emerging artists to global brands.",
    },
    job: {
      title: "Lead Product Designer, Creative Cloud",
      location: "San Jose, CA (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Lead",
      salaryMin: 165000,
      salaryMax: 210000,
      salaryCurrency: "USD",
      description:
        `<p>Help define the future of Creative Cloud by researching, designing, and validating end-to-end workflows for professional creators. You will pair quantitative insights with qualitative research to ship features that feel magical and empowering.</p>
         <p>We're looking for a systems thinker invested in accessibility, collaboration, and craft.</p>`,
      requirements: [
        "7+ years of experience in product design or UX",
        "Portfolio demonstrating shipped features across web or desktop",
        "Fluent in Figma, prototyping tools, and design systems",
        "Experience facilitating workshops and research synthesis",
        "Strong storytelling and stakeholder alignment skills",
      ],
      responsibilities: [
        "Own product design for a cross-platform Creative Cloud surface",
        "Conduct user research and translate findings into actionable insights",
        "Define interaction patterns and contribute to Adobe design systems",
        "Partner with PM and engineering to prioritize customer value",
        "Advocate for inclusive design principles across the org",
      ],
      benefits: [
        "Educational reimbursement and professional development",
        "Wellness stipend and mental health resources",
        "Employee stock purchase plan",
        "401(k) match and financial planning tools",
        "Generous vacation and volunteer time off",
      ],
      applicationUrl: "https://careers.adobe.com/us/en/job-search",
      postedDate: subDays(now, 22).toISOString(),
      source: "curated",
    },
  },
  // Dummy companies appended after real listings
  {
    externalId: "dummy-solstice-analytics-001",
    company: {
      name: "Solstice Analytics",
      websiteUrl: "https://solstice-analytics.example.com/careers",
      logoUrl: "https://dummyimage.com/96x96/1f2937/f9fafb&text=SA",
      industry: "Data & Insights",
      location: "Remote",
      size: "51-200 employees",
      description:
        "Solstice Analytics designs analytics platforms that help climate-focused organizations measure and accelerate their impact.",
    },
    job: {
      title: "Staff Data Engineer",
      location: "Remote (North America)",
      jobType: "Full-time",
      experienceLevel: "Senior",
      salaryMin: 145000,
      salaryMax: 175000,
      salaryCurrency: "USD",
      description:
        `<p>Solstice Analytics is expanding its climate data platform and needs a Staff Data Engineer to architect resilient pipelines, wrangle complex datasets, and mentor a growing team.</p>
         <p>You will work closely with climatologists, product, and design to ship reliable analytics experiences.</p>`,
      requirements: [
        "5+ years building data-intensive products",
        "Expertise with Python, SQL, and streaming architectures",
        "Experience leading technical initiatives across squads",
        "Comfortable operating in ambiguous, fast-paced environments",
      ],
      responsibilities: [
        "Design and maintain scalable ingestion pipelines",
        "Evolve data quality tooling and observability",
        "Guide schema design that supports analytics and ML use cases",
        "Mentor engineers and contribute to engineering culture",
      ],
      benefits: [
        "Remote-first culture with quarterly in-person retreats",
        "Learning stipend and conference budget",
        "Home office equipment allowance",
        "Unlimited PTO with minimum time-off policy",
      ],
      applicationUrl: "https://solstice-analytics.example.com/careers/data-engineer",
      postedDate: subDays(now, 40).toISOString(),
      source: "dummy",
    },
  },
  {
    externalId: "dummy-orbit-labs-002",
    company: {
      name: "Orbit Labs",
      websiteUrl: "https://orbitlabs.example.com/jobs",
      logoUrl: "https://dummyimage.com/96x96/0f172a/f9fafb&text=OL",
      industry: "Fintech",
      location: "New York, NY",
      size: "201-500 employees",
      description:
        "Orbit Labs builds modern treasury tools that help startups manage runway, FX, and compliance across borders.",
    },
    job: {
      title: "Technical Product Manager, Payments",
      location: "New York, NY (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Mid-Senior",
      salaryMin: 135000,
      salaryMax: 165000,
      salaryCurrency: "USD",
      description:
        `<p>As the TPM for the Payments team you will own product discovery, roadmap, and delivery for cross-border payments experiences that power Orbit's treasury platform.</p>
         <p>We are seeking a curious product thinker who understands APIs, compliance, and delightful UX.</p>`,
      requirements: [
        "4+ years in product management or technical program management",
        "Experience with payment networks, compliance, or fintech APIs",
        "Ability to translate customer feedback into clear product requirements",
        "Strong collaboration skills across engineering, design, and operations",
      ],
      responsibilities: [
        "Own the roadmap for settlement, reconciliation, and FX features",
        "Define success metrics and communicate progress to leadership",
        "Partner with design to validate prototypes and interaction patterns",
        "Coordinate launches with legal, risk, and support stakeholders",
      ],
      benefits: [
        "Competitive salary with equity grants",
        "Medical, dental, and vision coverage",
        "401(k) with immediate vesting",
        "Weekly in-office lunches and commuter benefits",
      ],
      applicationUrl: "https://orbitlabs.example.com/jobs/product-manager-payments",
      postedDate: subDays(now, 52).toISOString(),
      source: "dummy",
    },
  },
  {
    externalId: "dummy-echoprep-003",
    company: {
      name: "EchoPrep Labs",
      websiteUrl: "https://echoprep.ai/careers",
      logoUrl: "https://dummyimage.com/96x96/312e81/f9fafb&text=EP",
      industry: "AI Coaching",
      location: "Remote",
      size: "11-50 employees",
      description:
        "EchoPrep Labs builds AI-first coaching experiences that prepare candidates for modern hiring processes.",
    },
    job: {
      title: "AI Conversation Designer",
      location: "Remote (Global)",
      jobType: "Contract",
      experienceLevel: "Mid-Level",
      salaryMin: 90000,
      salaryMax: 120000,
      salaryCurrency: "USD",
      description:
        `<p>Help craft the voice of EchoPrep's AI interviewers by writing prompts, scripting multi-turn dialogues, and partnering with researchers to fine-tune models.</p>
         <p>You care about inclusive language, behavioral science, and measurable learning outcomes.</p>`,
      requirements: [
        "3+ years in conversational design, UX writing, or content strategy",
        "Experience with LLM prompt design or chatbot tooling",
        "Portfolio demonstrating structured storytelling and scenario design",
        "Comfortable analyzing conversation analytics and experiment results",
      ],
      responsibilities: [
        "Create prompt libraries that simulate behavioral and technical interviews",
        "Partner with product to map interview flows and scoring rubrics",
        "Collaborate with research to evaluate interaction quality",
        "Document best practices and guidelines for conversational AI",
      ],
      benefits: [
        "Remote-friendly with flexible hours",
        "Monthly wellness stipend",
        "Professional development budget",
        "Opportunity to convert to full-time",
      ],
      applicationUrl: "https://echoprep.ai/careers/conversation-designer",
      postedDate: subDays(now, 60).toISOString(),
      source: "dummy",
    },
  },
  {
    externalId: "curated-tcs-india-fullstack-001",
    company: {
      name: "Tata Consultancy Services (TCS)",
      websiteUrl: "https://www.tcs.com/careers",
      logoUrl: "https://logo.clearbit.com/tcs.com",
      industry: "IT Services & Consulting",
      location: "Mumbai, India",
      size: "10,000+ employees",
      description:
        "TCS is a global leader in IT services, consulting, and business solutions. We partner with clients across industries to deliver transformative solutions using cutting-edge technology.",
    },
    job: {
      title: "Senior Full Stack Developer",
      location: "Mumbai, Maharashtra, India (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Senior",
      salaryMin: 1500000,
      salaryMax: 2500000,
      salaryCurrency: "INR",
      description:
        `<p>Join TCS as a Senior Full Stack Developer to work on enterprise-grade applications for global clients. You will lead development of scalable web platforms using modern JavaScript frameworks and cloud technologies.</p>
         <p>This role offers exposure to diverse industries including banking, healthcare, and retail. You'll work with cross-functional teams across multiple geographies and contribute to digital transformation initiatives.</p>`,
      requirements: [
        "6-8 years of experience in full stack development",
        "Strong expertise in React.js, Node.js, and TypeScript",
        "Experience with microservices architecture and RESTful APIs",
        "Proficiency in SQL and NoSQL databases (PostgreSQL, MongoDB)",
        "Knowledge of cloud platforms (AWS, Azure, or GCP)",
        "Excellent communication skills for client interactions",
      ],
      responsibilities: [
        "Design and develop end-to-end features for enterprise applications",
        "Lead code reviews and mentor junior developers",
        "Collaborate with product managers and stakeholders to gather requirements",
        "Implement CI/CD pipelines and ensure code quality",
        "Optimize application performance and scalability",
        "Participate in agile ceremonies and sprint planning",
      ],
      benefits: [
        "Competitive salary with annual performance bonus",
        "Health insurance for employee and family",
        "Provident Fund (PF) and gratuity benefits",
        "Flexible work arrangements (Work from Home options)",
        "Learning and development programs",
        "International project opportunities",
        "Employee wellness programs",
      ],
      applicationUrl: "https://www.tcs.com/careers",
      postedDate: subDays(now, 10).toISOString(),
      source: "curated",
    },
  },
  {
    externalId: "curated-infosys-india-data-002",
    company: {
      name: "Infosys",
      websiteUrl: "https://www.infosys.com/careers/",
      logoUrl: "https://logo.clearbit.com/infosys.com",
      industry: "IT Services & Consulting",
      location: "Bangalore, India",
      size: "10,000+ employees",
      description:
        "Infosys is a global leader in next-generation digital services and consulting. We enable clients in 50+ countries to navigate their digital transformation.",
    },
    job: {
      title: "Data Engineer - Big Data & Analytics",
      location: "Bangalore, Karnataka, India (On-site)",
      jobType: "Full-time",
      experienceLevel: "Mid-level",
      salaryMin: 1200000,
      salaryMax: 1800000,
      salaryCurrency: "INR",
      description:
        `<p>As a Data Engineer at Infosys, you'll build robust data pipelines and analytics platforms for Fortune 500 clients. Work with cutting-edge big data technologies including Spark, Kafka, and cloud-native data warehouses.</p>
         <p>This role involves designing scalable ETL processes, optimizing data lakes, and collaborating with data scientists to enable AI/ML initiatives.</p>`,
      requirements: [
        "4-6 years of experience in data engineering or related field",
        "Strong proficiency in Python, SQL, and data modeling",
        "Hands-on experience with Apache Spark, Kafka, and Airflow",
        "Experience with cloud data platforms (AWS Redshift, Azure Synapse, or GCP BigQuery)",
        "Knowledge of data warehousing concepts and best practices",
        "Familiarity with containerization (Docker, Kubernetes)",
      ],
      responsibilities: [
        "Design and implement scalable data pipelines for batch and streaming data",
        "Build and maintain data lakes and warehouses on cloud platforms",
        "Optimize ETL processes for performance and cost efficiency",
        "Collaborate with data scientists to prepare data for ML models",
        "Implement data quality checks and monitoring systems",
        "Document data architecture and technical specifications",
      ],
      benefits: [
        "Competitive compensation with performance incentives",
        "Comprehensive health insurance (medical, dental, vision)",
        "Provident Fund and gratuity",
        "Professional certification programs (AWS, Azure, Google Cloud)",
        "Flexible work hours and work-from-home options",
        "Onsite cafeteria and transportation facilities",
        "Annual performance-based salary increments",
      ],
      applicationUrl: "https://www.infosys.com/careers/",
      postedDate: subDays(now, 15).toISOString(),
      source: "curated",
    },
  },
  {
    externalId: "curated-flipkart-india-product-003",
    company: {
      name: "Flipkart",
      websiteUrl: "https://www.flipkartcareers.com/",
      logoUrl: "https://logo.clearbit.com/flipkart.com",
      industry: "E-commerce",
      location: "Bangalore, India",
      size: "10,000+ employees",
      description:
        "Flipkart is India's leading e-commerce marketplace, offering 150 million products across 80+ categories. We're building the future of online retail in India.",
    },
    job: {
      title: "Senior Product Manager - Customer Experience",
      location: "Bangalore, Karnataka, India (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Senior",
      salaryMin: 2500000,
      salaryMax: 4000000,
      salaryCurrency: "INR",
      description:
        `<p>Lead product strategy for Flipkart's customer experience platform, impacting millions of users daily. You'll drive innovation in personalization, recommendations, and user engagement across mobile and web.</p>
         <p>This is a high-impact role working directly with engineering, design, and data science teams to build features that delight customers and drive business growth.</p>`,
      requirements: [
        "6-10 years of product management experience, preferably in e-commerce or consumer tech",
        "Strong analytical skills with experience in data-driven decision making",
        "Proven track record of launching successful consumer products at scale",
        "Experience with A/B testing, user research, and product analytics",
        "Excellent communication and stakeholder management skills",
        "MBA or equivalent advanced degree preferred",
      ],
      responsibilities: [
        "Define product vision and roadmap for customer experience features",
        "Conduct user research and analyze data to identify opportunities",
        "Work with engineering teams to prioritize and ship features",
        "Design and run experiments to validate hypotheses and measure impact",
        "Collaborate with design, marketing, and business teams",
        "Track key metrics (conversion, retention, engagement) and optimize",
        "Present product strategy and results to senior leadership",
      ],
      benefits: [
        "Competitive salary with ESOPs (stock options)",
        "Performance-based bonuses and annual increments",
        "Comprehensive health insurance for family",
        "Flexible work arrangements (hybrid model)",
        "Learning and development budget",
        "Onsite gym, cafeteria, and recreational facilities",
        "Parental leave and childcare support",
        "Employee discounts on Flipkart products",
      ],
      applicationUrl: "https://www.flipkartcareers.com/",
      postedDate: subDays(now, 8).toISOString(),
      source: "curated",
    },
  },
  {
    externalId: "curated-wipro-india-devops-004",
    company: {
      name: "Wipro",
      websiteUrl: "https://careers.wipro.com/",
      logoUrl: "https://logo.clearbit.com/wipro.com",
      industry: "IT Services & Consulting",
      location: "Hyderabad, India",
      size: "10,000+ employees",
      description:
        "Wipro is a leading global information technology, consulting, and business process services company committed to delivering innovative solutions.",
    },
    job: {
      title: "DevOps Engineer - Cloud Infrastructure",
      location: "Hyderabad, Telangana, India (Hybrid)",
      jobType: "Full-time",
      experienceLevel: "Mid-level",
      salaryMin: 1000000,
      salaryMax: 1600000,
      salaryCurrency: "INR",
      description:
        `<p>Join Wipro's Cloud Engineering team to design and manage infrastructure for global enterprises. You'll automate deployments, optimize cloud costs, and ensure high availability of mission-critical applications.</p>
         <p>Work with modern DevOps tools and practices including Infrastructure as Code, CI/CD pipelines, and container orchestration.</p>`,
      requirements: [
        "3-5 years of experience in DevOps or Cloud Engineering",
        "Strong knowledge of AWS, Azure, or Google Cloud Platform",
        "Experience with infrastructure automation tools (Terraform, Ansible, CloudFormation)",
        "Proficiency in scripting languages (Python, Bash, PowerShell)",
        "Hands-on experience with Kubernetes and Docker",
        "Knowledge of CI/CD tools (Jenkins, GitLab CI, GitHub Actions)",
        "Understanding of networking, security, and monitoring concepts",
      ],
      responsibilities: [
        "Design and implement cloud infrastructure using Infrastructure as Code",
        "Build and maintain CI/CD pipelines for automated deployments",
        "Manage containerized applications on Kubernetes clusters",
        "Monitor system performance and implement alerting mechanisms",
        "Optimize cloud costs and resource utilization",
        "Ensure security compliance and implement best practices",
        "Collaborate with development teams to improve deployment processes",
        "Provide technical support and troubleshooting for production issues",
      ],
      benefits: [
        "Competitive salary with performance bonuses",
        "Health insurance for self and dependents",
        "Provident Fund and gratuity",
        "Professional certification sponsorship (AWS, Azure, Kubernetes)",
        "Flexible working hours and remote work options",
        "Learning platforms access (Udemy, Pluralsight, Coursera)",
        "Transportation and meal allowances",
        "Annual performance appraisals and growth opportunities",
      ],
      applicationUrl: "https://careers.wipro.com/",
      postedDate: subDays(now, 12).toISOString(),
      source: "curated",
    },
  },
];
