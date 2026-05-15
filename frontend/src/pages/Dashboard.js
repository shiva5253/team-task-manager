import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  FolderKanban, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Activity, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
  <div className="card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setData(response.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  const { stats, projectProgress, priorityDistribution, recentActivity, myTasks } = data;

  const statusData = [
    { name: 'Todo', value: stats.todoTasks },
    { name: 'In Progress', value: stats.inProgressTasks },
    { name: 'Review', value: stats.reviewTasks },
    { name: 'Done', value: stats.completedTasks },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: 'High', value: priorityDistribution.High },
    { name: 'Medium', value: priorityDistribution.Medium },
    { name: 'Low', value: priorityDistribution.Low },
  ];

  const getStatusColor = (status) => {
    const colors = {
      'Todo': 'bg-gray-100 text-gray-700',
      'In Progress': 'bg-yellow-100 text-yellow-700',
      'Review': 'bg-purple-100 text-purple-700',
      'Done': 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'High': 'bg-red-100 text-red-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-green-100 text-green-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          icon={FolderKanban}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={Activity}
          color="bg-purple-500"
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          icon={CheckCircle2}
          color="bg-green-500"
          trend="up"
          trendValue={`${stats.completionRate}% completion rate`}
        />
        <StatCard
          title="Overdue"
          value={stats.overdueTasks}
          icon={Clock}
          color="bg-red-500"
          trend={stats.overdueTasks > 0 ? 'down' : 'up'}
          trendValue={stats.overdueTasks > 0 ? 'Needs attention' : 'All on track'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-sm text-gray-600">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Project Progress */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Progress</h3>
        <div className="space-y-4">
          {projectProgress.map((project) => (
            <div key={project.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{project.name}</span>
                <span className="text-gray-500">{project.completedTasks}/{project.totalTasks} tasks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1">{project.progress}% complete</span>
            </div>
          ))}
          {projectProgress.length === 0 && (
            <p className="text-gray-500 text-center py-4">No projects yet</p>
          )}
        </div>
      </div>

      {/* My Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Tasks</h3>
          <div className="space-y-3">
            {myTasks?.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border ${task.isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-sm text-gray-500">{task.project?.name}</p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <span className={`badge ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                    <span className={`badge ${getStatusColor(task.status)}`}>{task.status}</span>
                  </div>
                </div>
                {task.dueDate && (
                  <p className={`text-xs mt-1 ${task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                    {task.isOverdue && ' (Overdue)'}
                  </p>
                )}
              </div>
            ))}
            {(!myTasks || myTasks.length === 0) && (
              <p className="text-gray-500 text-center py-4">No tasks assigned to you</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivity?.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user?.name}</span>{' '}
                    <span className="text-gray-500">{activity.action.toLowerCase()}d</span>{' '}
                    <span className="font-medium">{activity.entityType}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
