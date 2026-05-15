require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/sequelize');
const { User, Project, ProjectMember, Task, ActivityLog } = require('../models');

const seedDatabase = async () => {
  try {
    // Clear existing data
    await ActivityLog.destroy({ where: {} });
    await Task.destroy({ where: {} });
    await ProjectMember.destroy({ where: {} });
    await Project.destroy({ where: {} });
    await User.destroy({ where: {} });

    console.log('Existing data cleared');

    // Create users
    const adminPassword = 'Admin123!';
    const memberPassword = 'Member123!';

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin'
    });

    const member1 = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: memberPassword,
      role: 'member'
    });

    const member2 = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: memberPassword,
      role: 'member'
    });

    const member3 = await User.create({
      name: 'Bob Wilson',
      email: 'bob@example.com',
      password: memberPassword,
      role: 'member'
    });

    console.log('Users created');

    // Create projects
    const project1 = await Project.create({
      name: 'Website Redesign',
      description: 'Complete redesign of company website with modern UI/UX',
      status: 'Active',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: admin.id
    });

    const project2 = await Project.create({
      name: 'Mobile App Development',
      description: 'Build cross-platform mobile application',
      status: 'Active',
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      createdBy: admin.id
    });

    const project3 = await Project.create({
      name: 'Database Migration',
      description: 'Migrate legacy database to PostgreSQL',
      status: 'On Hold',
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      createdBy: admin.id
    });

    console.log('Projects created');

    // Add members to projects
    await ProjectMember.create({ projectId: project1.id, userId: admin.id, role: 'lead' });
    await ProjectMember.create({ projectId: project1.id, userId: member1.id, role: 'member' });
    await ProjectMember.create({ projectId: project1.id, userId: member2.id, role: 'member' });

    await ProjectMember.create({ projectId: project2.id, userId: admin.id, role: 'lead' });
    await ProjectMember.create({ projectId: project2.id, userId: member1.id, role: 'member' });
    await ProjectMember.create({ projectId: project2.id, userId: member3.id, role: 'member' });

    await ProjectMember.create({ projectId: project3.id, userId: admin.id, role: 'lead' });
    await ProjectMember.create({ projectId: project3.id, userId: member2.id, role: 'member' });

    console.log('Project members added');

    // Create tasks
    const tasks = [
      {
        title: 'Design homepage mockup',
        description: 'Create Figma mockups for new homepage design',
        priority: 'High',
        status: 'Done',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        projectId: project1.id,
        assignedTo: member1.id,
        createdBy: admin.id
      },
      {
        title: 'Implement responsive navigation',
        description: 'Build responsive navbar with mobile hamburger menu',
        priority: 'High',
        status: 'In Progress',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        projectId: project1.id,
        assignedTo: member2.id,
        createdBy: admin.id
      },
      {
        title: 'Set up authentication flow',
        description: 'Implement JWT authentication with refresh tokens',
        priority: 'High',
        status: 'Todo',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        projectId: project1.id,
        assignedTo: member1.id,
        createdBy: admin.id
      },
      {
        title: 'API endpoint documentation',
        description: 'Document all REST API endpoints with examples',
        priority: 'Medium',
        status: 'Review',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        projectId: project1.id,
        assignedTo: member2.id,
        createdBy: admin.id
      },
      {
        title: 'User registration screen',
        description: 'Build user registration UI with form validation',
        priority: 'Medium',
        status: 'In Progress',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        projectId: project2.id,
        assignedTo: member1.id,
        createdBy: admin.id
      },
      {
        title: 'Push notification service',
        description: 'Implement push notifications for task updates',
        priority: 'Low',
        status: 'Todo',
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        projectId: project2.id,
        assignedTo: member3.id,
        createdBy: admin.id
      },
      {
        title: 'Database schema design',
        description: 'Design normalized PostgreSQL schema for all entities',
        priority: 'High',
        status: 'Done',
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        projectId: project3.id,
        assignedTo: member2.id,
        createdBy: admin.id
      },
      {
        title: 'Data migration scripts',
        description: 'Write scripts to migrate data from legacy system',
        priority: 'High',
        status: 'Todo',
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        projectId: project3.id,
        assignedTo: admin.id,
        createdBy: admin.id
      }
    ];

    await Task.bulkCreate(tasks);
    console.log('Tasks created');

    // Create activity logs
    const activities = [
      { userId: admin.id, action: 'CREATE', entityType: 'project', entityId: project1.id, details: { name: project1.name } },
      { userId: admin.id, action: 'CREATE', entityType: 'project', entityId: project2.id, details: { name: project2.name } },
      { userId: admin.id, action: 'CREATE', entityType: 'task', entityId: tasks[0].id, details: { title: tasks[0].title } },
      { userId: member1.id, action: 'UPDATE_STATUS', entityType: 'task', entityId: tasks[0].id, details: { title: tasks[0].title, newStatus: 'Done' } },
      { userId: admin.id, action: 'ADD_MEMBER', entityType: 'project', entityId: project1.id, details: { projectName: project1.name, memberName: 'John Doe' } }
    ];

    await ActivityLog.bulkCreate(activities);
    console.log('Activity logs created');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('Admin: admin@example.com / Admin123!');
    console.log('Member: john@example.com / Member123!');
    console.log('Member: jane@example.com / Member123!');
    console.log('Member: bob@example.com / Member123!');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
