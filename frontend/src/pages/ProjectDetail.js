import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectAPI, taskAPI } from '../services/api';
import {
  ArrowLeft, Plus, Users, Calendar, Edit2, Trash2, CheckCircle2,
  AlertTriangle, Clock, Filter, Search, X, ChevronDown,
  GripVertical, MoreVertical, UserPlus, UserMinus
} from 'lucide-react';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState({ status: '', priority: '', search: '' });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Todo',
    dueDate: '',
    assignedTo: ''
  });

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [id]);

  useEffect(() => {
    fetchTasks();
  }, [taskFilter]);

  const fetchProject = async () => {
    try {
      const response = await projectAPI.getById(id);
      setProject(response.data.data.project);
    } catch (err) {
      navigate('/projects');
    }
  };

  const fetchTasks = async () => {
    try {
      const params = {};
      if (taskFilter.status) params.status = taskFilter.status;
      if (taskFilter.priority) params.priority = taskFilter.priority;
      if (taskFilter.search) params.search = taskFilter.search;

      const response = await taskAPI.getByProject(id, params);
      setTasks(response.data.data.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await taskAPI.update(editingTask.id, taskForm);
      } else {
        await taskAPI.create(id, taskForm);
      }
      setShowTaskModal(false);
      setEditingTask(null);
      resetTaskForm();
      fetchTasks();
      fetchProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      fetchTasks();
      fetchProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteTask = async () => {
    try {
      await taskAPI.delete(deleteTaskId);
      setDeleteTaskId(null);
      fetchTasks();
      fetchProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await projectAPI.addMember(id, { userId, role: 'member' });
      setShowMemberModal(false);
      fetchProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await projectAPI.removeMember(id, userId);
      setMemberToRemove(null);
      fetchProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: task.assignedTo || ''
    });
    setShowTaskModal(true);
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'Medium',
      status: 'Todo',
      dueDate: '',
      assignedTo: ''
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Todo': 'bg-gray-100 text-gray-700 border-gray-200',
      'In Progress': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Review': 'bg-purple-50 text-purple-700 border-purple-200',
      'Done': 'bg-green-50 text-green-700 border-green-200',
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

  const kanbanColumns = ['Todo', 'In Progress', 'Review', 'Done'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) return null;

  const isProjectMember = project.members?.some(m => m.id === user?.id);
  const canEdit = isAdmin || isProjectMember;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <span className={`badge ${
              project.status === 'Active' ? 'bg-green-100 text-green-700' :
              project.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {project.status}
            </span>
          </div>
          <p className="text-gray-500 mt-1">{project.description}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingTask(null);
              resetTaskForm();
              setShowTaskModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </button>
        )}
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Members</p>
              <p className="text-lg font-semibold">{project.members?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tasks</p>
              <p className="text-lg font-semibold">{tasks.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Deadline</p>
              <p className="text-lg font-semibold">
                {project.deadline
                  ? new Date(project.deadline).toLocaleDateString()
                  : 'No deadline'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          {isAdmin && (
            <button
              onClick={() => setShowMemberModal(true)}
              className="btn-secondary text-sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {project.members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {member.ProjectMember?.role || 'member'}
                </p>
              </div>
              {isAdmin && member.id !== project.createdBy && (
                <button
                  onClick={() => setMemberToRemove(member)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={taskFilter.search}
                onChange={(e) => setTaskFilter({ ...taskFilter, search: e.target.value })}
                className="input-field pl-10 text-sm"
              />
            </div>
            <select
              value={taskFilter.status}
              onChange={(e) => setTaskFilter({ ...taskFilter, status: e.target.value })}
              className="input-field text-sm"
            >
              <option value="">All Statuses</option>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Done">Done</option>
            </select>
            <select
              value={taskFilter.priority}
              onChange={(e) => setTaskFilter({ ...taskFilter, priority: e.target.value })}
              className="input-field text-sm"
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                Board
              </button>
            </div>
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`card py-4 hover:shadow-md transition-shadow ${
                  task.isOverdue ? 'border-l-4 border-l-red-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      {task.isOverdue && (
                        <span className="badge bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className={`badge ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`badge ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      {task.assignee && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Users className="w-3 h-3" />
                          {task.assignee.name}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${
                          task.isOverdue ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {canEdit && (
                      <>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="text-sm border-gray-300 rounded-md"
                        >
                          <option value="Todo">Todo</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Review">Review</option>
                          <option value="Done">Done</option>
                        </select>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditTask(task)}
                              className="p-2 text-gray-400 hover:text-primary-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTaskId(task.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tasks found</p>
              </div>
            )}
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map((column) => (
              <div key={column} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-700">{column}</h4>
                  <span className="text-sm text-gray-500">
                    {tasks.filter(t => t.status === column).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {tasks
                    .filter((task) => task.status === column)
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`bg-white p-3 rounded-lg shadow-sm border ${
                          task.isOverdue ? 'border-red-200' : 'border-gray-200'
                        } hover:shadow-md transition-shadow cursor-pointer`}
                        onClick={() => canEdit && openEditTask(task)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-sm text-gray-900">{task.title}</h5>
                          <span className={`badge text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.assignee && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                            <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                              {task.assignee.name.charAt(0)}
                            </div>
                            {task.assignee.name}
                          </div>
                        )}
                        {task.dueDate && (
                          <p className={`text-xs ${task.isOverdue ? 'text-red-600' : 'text-gray-400'}`}>
                            {new Date(task.dueDate).toLocaleDateString()}
                            {task.isOverdue && ' (Overdue)'}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h2>
            </div>
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Unassigned</option>
                    {project.members?.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                    resetTaskForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation */}
      {deleteTaskId && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTaskId(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-500 mb-4">Select a user to add to this project</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* This would fetch available users - simplified for now */}
                <p className="text-sm text-gray-500 text-center py-4">
                  Feature: Fetch available users from API
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowMemberModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Remove Member</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove {memberToRemove.name} from this project?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMemberToRemove(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(memberToRemove.id)}
                className="btn-danger"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
