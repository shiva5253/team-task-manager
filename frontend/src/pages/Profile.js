import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import {
  UserCircle, Mail, Shield, Calendar, CheckCircle2, Clock,
  AlertTriangle, TrendingUp, Activity
} from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getMe();
      setProfile(response.data.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
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

  const { user: userData, stats, tasks, projects, activities } = profile;

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
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Your account information and activity</p>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold text-white">
            {userData?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{userData?.name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {userData?.email}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span className="capitalize">{userData?.role}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(userData?.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.completedTasks || 0}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalTasks || 0}</p>
              <p className="text-sm text-gray-500">Total Tasks</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.overdueTasks || 0}</p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.completionRate || 0}%</p>
              <p className="text-sm text-gray-500">Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
          <div className="space-y-3">
            {tasks?.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border ${task.isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.project?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`badge text-xs ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                    <span className={`badge text-xs ${getStatusColor(task.status)}`}>{task.status}</span>
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
            {(!tasks || tasks.length === 0) && (
              <p className="text-gray-500 text-center py-4">No tasks yet</p>
            )}
          </div>
        </div>

        {/* Projects */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Projects</h3>
          <div className="space-y-3">
            {projects?.map((project) => (
              <div key={project.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{project.name}</p>
                  <span className={`badge text-xs ${
                    project.status === 'Active' ? 'bg-green-100 text-green-700' :
                    project.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {project.status}
                  </span>
                </div>
                {project.deadline && (
                  <p className="text-xs text-gray-400 mt-1">
                    Deadline: {new Date(project.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
            {(!projects || projects.length === 0) && (
              <p className="text-gray-500 text-center py-4">No projects yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {activities?.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.action}</span>{' '}
                  <span className="text-gray-500">{activity.entityType}</span>
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {(!activities || activities.length === 0) && (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
