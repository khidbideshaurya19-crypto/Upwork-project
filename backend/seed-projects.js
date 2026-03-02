const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db } = require('./firebase');

const dummyProjects = [
  {
    title: 'E-Commerce Website Redesign',
    description: 'We need a complete redesign of our e-commerce platform. The current site is outdated and needs a modern UI/UX overhaul with responsive design, improved checkout flow, and better product filtering. Must integrate with our existing Stripe payment system.',
    category: 'Web Development',
    budget: 5000,
    budgetType: 'fixed',
    duration: '2-3 months',
    skills: ['React', 'Node.js', 'CSS', 'Stripe API', 'Figma'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'Mobile App for Food Delivery Service',
    description: 'Build a cross-platform mobile app for a food delivery startup. Features include real-time order tracking, push notifications, in-app payments, restaurant listings, and a rating system. Must support both iOS and Android.',
    category: 'Mobile Development',
    budget: 8000,
    budgetType: 'fixed',
    duration: '3-4 months',
    skills: ['React Native', 'Firebase', 'Google Maps API', 'Redux', 'Node.js'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'SEO Optimization & Content Strategy',
    description: 'Looking for an SEO expert to audit our existing website, develop a keyword strategy, optimize on-page SEO, and create a 6-month content calendar. We are a SaaS company targeting B2B clients in the fintech space.',
    category: 'Digital Marketing',
    budget: 45,
    budgetType: 'hourly',
    duration: '1-2 months',
    skills: ['SEO', 'Content Writing', 'Google Analytics', 'Ahrefs', 'Keyword Research'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'Machine Learning Model for Customer Churn Prediction',
    description: 'We have a dataset of 500K+ customer records and need a predictive model to identify customers at risk of churning. Deliverables include a trained model, evaluation metrics, and a simple API endpoint for predictions.',
    category: 'Data Science',
    budget: 6500,
    budgetType: 'fixed',
    duration: '1-2 months',
    skills: ['Python', 'Scikit-learn', 'Pandas', 'TensorFlow', 'REST API'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'Brand Identity & Logo Design',
    description: 'New tech startup needs a complete brand identity package including logo, color palette, typography, business cards, letterhead, and brand guidelines document. We want a modern, clean, and professional look.',
    category: 'Graphic Design',
    budget: 2000,
    budgetType: 'fixed',
    duration: 'Less than 1 month',
    skills: ['Adobe Illustrator', 'Branding', 'Typography', 'Logo Design', 'Photoshop'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'WordPress Plugin Development',
    description: 'Need a custom WordPress plugin that integrates with WooCommerce to provide advanced inventory management. Features: bulk import/export, low-stock alerts, supplier management, and purchase order generation.',
    category: 'Web Development',
    budget: 3500,
    budgetType: 'fixed',
    duration: '1-2 months',
    skills: ['PHP', 'WordPress', 'WooCommerce', 'MySQL', 'JavaScript'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'DevOps Infrastructure Setup on AWS',
    description: 'Set up a production-ready AWS infrastructure with CI/CD pipelines, containerized deployments using ECS/EKS, monitoring with CloudWatch, and automated scaling. Current stack is Node.js backend with React frontend.',
    category: 'DevOps & Cloud',
    budget: 75,
    budgetType: 'hourly',
    duration: '1-2 months',
    skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'Technical Blog Writing - AI & Cloud Computing',
    description: 'We need 20 high-quality technical blog posts (1500-2000 words each) covering topics in AI, machine learning, and cloud computing. Posts must be well-researched, SEO-optimized, and include code examples where relevant.',
    category: 'Writing & Content',
    budget: 3000,
    budgetType: 'fixed',
    duration: '2-3 months',
    skills: ['Technical Writing', 'AI/ML Knowledge', 'SEO', 'Content Strategy', 'Research'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'Video Editing for YouTube Channel',
    description: 'Looking for a video editor to produce 8 videos per month for our tech review YouTube channel. Each video is 10-15 minutes. Requires cutting, color grading, motion graphics, sound design, and thumbnail creation.',
    category: 'Video & Animation',
    budget: 35,
    budgetType: 'hourly',
    duration: '3+ months',
    skills: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Motion Graphics', 'Thumbnail Design'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'Full-Stack Dashboard for IoT Sensors',
    description: 'Build a real-time dashboard to visualize data from 200+ IoT sensors. Needs WebSocket support for live updates, historical data charts, alert thresholds, and user role management. Backend should handle high-throughput data ingestion.',
    category: 'Web Development',
    budget: 9500,
    budgetType: 'fixed',
    duration: '2-3 months',
    skills: ['React', 'Node.js', 'WebSocket', 'PostgreSQL', 'Chart.js', 'MQTT'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'Cybersecurity Audit & Penetration Testing',
    description: 'Conduct a comprehensive security audit and penetration test for our web application and API. Deliverables include a detailed vulnerability report with severity ratings, remediation recommendations, and a follow-up re-test.',
    category: 'Cybersecurity',
    budget: 7000,
    budgetType: 'fixed',
    duration: '1-2 months',
    skills: ['Penetration Testing', 'OWASP', 'Burp Suite', 'Network Security', 'Security Auditing'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  },
  {
    title: 'Shopify Store Setup & Customization',
    description: 'Set up a Shopify store for a fashion brand with custom theme modifications, product catalog (150+ products), payment gateway integration, shipping rules, and email marketing automation via Klaviyo.',
    category: 'E-Commerce',
    budget: 2500,
    budgetType: 'fixed',
    duration: 'Less than 1 month',
    skills: ['Shopify', 'Liquid', 'HTML/CSS', 'Klaviyo', 'E-Commerce'],
    status: 'open',
    applicantsCount: 0,
    assignedTo: null
  }
];

async function seedProjects() {
  try {
    // Find a client user to assign as the project owner
    const usersSnap = await db.collection('users').where('role', '==', 'client').limit(1).get();
    let clientId = null;

    if (!usersSnap.empty) {
      clientId = usersSnap.docs[0].id;
      console.log(`Using existing client: ${usersSnap.docs[0].data().name || usersSnap.docs[0].data().email} (${clientId})`);
    } else {
      // Fallback: use any user
      const anyUser = await db.collection('users').limit(1).get();
      if (!anyUser.empty) {
        clientId = anyUser.docs[0].id;
        console.log(`No client found, using user: ${anyUser.docs[0].id}`);
      } else {
        console.log('No users in DB. Creating projects without a client ID.');
      }
    }

    let count = 0;
    for (const proj of dummyProjects) {
      const data = {
        ...proj,
        client: clientId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const ref = await db.collection('projects').add(data);
      count++;
      console.log(`  [${count}/12] Created: "${proj.title}" (${ref.id})`);
    }

    console.log(`\nDone! ${count} dummy projects seeded successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedProjects();
