import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Copy, 
  Check, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  BookOpen, 
  CheckCircle2, 
  MessageSquare, 
  ThumbsUp, 
  FileText, 
  BrainCircuit, 
  User as UserIcon,
  Sparkles,
  Bookmark,
  Share2,
  Trash2,
  ChevronRight
} from 'lucide-react';

interface GroupMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'Leader' | 'Member';
}

interface GroupTask {
  id: string;
  title: string;
  column: 'todo' | 'inprogress' | 'completed';
  priority: 'Low' | 'Medium' | 'High';
  assignee: string;
  dueDate: string;
  notes?: string;
}

interface SharedPost {
  id: string;
  author: string;
  authorRole: string;
  type: 'Note' | 'Quiz Result' | 'Summary' | 'Question';
  title: string;
  summary: string;
  content: string;
  timestamp: string;
  likes: number;
  hasLiked?: boolean;
  comments: { author: string; content: string; timestamp: string }[];
}

interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  description: string;
  inviteCode: string;
  members: GroupMember[];
  tasks: GroupTask[];
  feed: SharedPost[];
}

interface StudyGroupsViewProps {
  userId: string | null;
  userName?: string;
}

const DEFAULT_MOCK_GROUPS: StudyGroup[] = [
  {
    id: 'group_sci_10th',
    name: 'Grade 10 Science Superstars',
    subject: 'Science (Physics & Biology)',
    description: 'Preparation group for Board examinations focused on light reflection and heredity.',
    inviteCode: 'SJT842',
    members: [
      { id: '1', name: 'Alex Carter', role: 'Leader' },
      { id: '2', name: 'Priya Sharma', role: 'Member' },
      { id: '3', name: 'Siddharth Rajan', role: 'Member' },
      { id: '4', name: 'Emily Davis', role: 'Member' }
    ],
    tasks: [
      {
        id: 't1',
        title: 'Revise Snell\'s Law and glass slab refraction',
        column: 'inprogress',
        priority: 'High',
        assignee: 'Priya Sharma',
        dueDate: 'Within 2 days',
        notes: 'Read textbook chapter 10'
      },
      {
        id: 't2',
        title: 'Complete Heredity inheritance diagram homework',
        column: 'todo',
        priority: 'Medium',
        assignee: 'Siddharth Rajan',
        dueDate: 'By Friday',
        notes: 'Draw the monohybrid cross charts'
      },
      {
        id: 't3',
        title: 'Attempt Science mock test on Carbon structures',
        column: 'completed',
        priority: 'High',
        assignee: 'Alex Carter',
        dueDate: 'Completed yesterday',
        notes: 'Scored 92% on mock'
      }
    ],
    feed: [
      {
        id: 'p1',
        author: 'Alex Carter',
        authorRole: 'Leader',
        type: 'Summary',
        title: 'Light Reflection Formula Sheet',
        summary: 'Summarized core formulas including Mirror Formula, Lens Formula, and Magnification variables.',
        content: `### 1. Mirror Formula
1/f = 1/v + 1/u
Where:
- f: focal length
- v: image distance
- u: object distance

### 2. Lens Formula
1/f = 1/v - 1/u

### 3. Magnification (m)
- Mirror: m = -v/u = h'/h
- Lens: m = v/u = h'/h

*Tip:* Always enforce Cartesian sign convention! Distances in direction of incident ray are positive.`,
        timestamp: '2 hours ago',
        likes: 6,
        comments: [
          { author: 'Priya Sharma', content: 'This sheet saved my life before the pre-board test today! Thank you so much Alex!', timestamp: '1 hour ago' }
        ]
      },
      {
        id: 'p2',
        author: 'Priya Sharma',
        authorRole: 'Member',
        type: 'Question',
        title: 'Doubt: Can index of refraction be less than 1?',
        summary: 'Confused with refractive index concepts and speed of light constants.',
        content: 'Hey guys, I was studying optical density. Is it physically possible for the index of refraction of any substance to be less than 1 (i.e. where light travels faster than in a vacuum)? Let me know!',
        timestamp: '5 hours ago',
        likes: 2,
        comments: [
          { author: 'Alex Carter', content: 'No, because the speed of light in vacuum is the absolute maximum speed limit of the universe! Refractive index (n) = c/v. Since v is always less than c, n is always greater than 1.', timestamp: '4 hours ago' }
        ]
      }
    ]
  },
  {
    id: 'group_math_10th',
    name: 'Algebra Champions',
    subject: 'Mathematics',
    description: 'Quadratic equations & Arithmetic Progressions practice group.',
    inviteCode: 'SJT117',
    members: [
      { id: '5', name: 'Rohan Deshmukh', role: 'Leader' },
      { id: '6', name: 'Tanvi Joshi', role: 'Member' }
    ],
    tasks: [
      {
        id: 't4',
        title: 'Solve AP exercise 5.2 word problems',
        column: 'todo',
        priority: 'High',
        assignee: 'Tanvi Joshi',
        dueDate: 'By Saturday'
      }
    ],
    feed: [
      {
        id: 'p3',
        author: 'Rohan Deshmukh',
        authorRole: 'Leader',
        type: 'Quiz Result',
        title: 'Scored 5/5 on Quadratic Equations Daily Quiz!',
        summary: 'Achieved a perfect score on AP and Roots calculation questions.',
        content: 'Super happy! Just solved the quiz created on SJ Tutor AI. Mastered finding the roots using the quadratic formula: x = (-b ± √(b² - 4ac)) / (2a). Lets keep the streaks alive!',
        timestamp: '1 day ago',
        likes: 4,
        comments: []
      }
    ]
  }
];

export const StudyGroupsView: React.FC<StudyGroupsViewProps> = ({ userId, userName = 'You' }) => {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'feed' | 'members'>('board');
  
  // Creation/Join Modal & Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Forms
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // Task Creation State
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Share Content Feed State
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [feedTitle, setFeedTitle] = useState('');
  const [feedType, setFeedType] = useState<'Note' | 'Summary' | 'Question'>('Note');
  const [feedContent, setFeedContent] = useState('');

  // Comment State
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const key = `sjtutor_study_groups_${userId || 'guest'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setGroups(JSON.parse(saved));
      } catch (e) {
        setGroups(DEFAULT_MOCK_GROUPS);
      }
    } else {
      setGroups(DEFAULT_MOCK_GROUPS);
      localStorage.setItem(key, JSON.stringify(DEFAULT_MOCK_GROUPS));
    }
  }, [userId]);

  const saveToStorage = (updatedGroups: StudyGroup[]) => {
    setGroups(updatedGroups);
    const key = `sjtutor_study_groups_${userId || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(updatedGroups));
    if (selectedGroup) {
      const liveGroup = updatedGroups.find(g => g.id === selectedGroup.id);
      if (liveGroup) setSelectedGroup(liveGroup);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupSubject.trim()) return;

    const randomCode = 'SJT' + Math.floor(100 + Math.random() * 900);
    const newGroup: StudyGroup = {
      id: 'group_' + Date.now(),
      name: newGroupName,
      subject: newGroupSubject,
      description: newGroupDesc || 'A collaboration workspace for studying and revision.',
      inviteCode: randomCode,
      members: [
        { id: userId || 'you', name: userName, role: 'Leader' }
      ],
      tasks: [],
      feed: [
        {
          id: 'welcome_' + Date.now(),
          author: 'AI Companion',
          authorRole: 'System',
          type: 'Note',
          title: 'Welcome to your Shared study Group Board!',
          summary: 'A short guide to using your collaboration workspace.',
          content: `Welcome to **${newGroupName}**! 🎉\n\nHere is how you can collaborate:\n1. **Tasks Board**: Move study plans from "To Study" to "Mastered".\n2. **Shared Feed**: Share your generated summaries, formulas, and ask questions to group members.\n3. **Join Friends**: Give them the invite code **${randomCode}** to let them collaborate.`,
          timestamp: 'Just now',
          likes: 0,
          comments: []
        }
      ]
    };

    const updated = [...groups, newGroup];
    saveToStorage(updated);
    setSelectedGroup(newGroup);
    setActiveTab('board');
    
    // Reset Form
    setNewGroupName('');
    setNewGroupSubject('');
    setNewGroupDesc('');
    setShowCreateModal(false);
  };

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    // Check if user is already in that group
    const alreadyMember = groups.find(g => g.inviteCode === cleanCode);
    if (alreadyMember) {
      setSelectedGroup(alreadyMember);
      setShowJoinModal(false);
      setJoinCodeInput('');
      setJoinError('');
      return;
    }

    // Since this is client-side prototype, we simulate finding the group or importing a pre-existing key
    // Let's create a realistic mock join
    if (cleanCode.startsWith('SJT')) {
      const mockJoins: Record<string, StudyGroup> = {
        'SJT500': {
          id: 'group_maths_99',
          name: 'AP Arithmetic and Trigonometry prep',
          subject: 'Advanced Core Math',
          description: 'Working together through complex formulas and trigonometry identity proofs.',
          inviteCode: 'SJT500',
          members: [
            { id: '7', name: 'Vikram Seth', role: 'Leader' },
            { id: userId || 'you', name: userName, role: 'Member' }
          ],
          tasks: [
            { id: 't99', title: 'Derive cosine law identity proofs', column: 'todo', priority: 'High', assignee: 'Vikram Seth', dueDate: 'Soon' }
          ],
          feed: []
        }
      };

      const foundGroup = mockJoins[cleanCode] || {
        id: 'group_joined_' + Date.now(),
        name: `Joined Group (${cleanCode})`,
        subject: 'General Prep',
        description: 'An aligned learning space.',
        inviteCode: cleanCode,
        members: [
          { id: 'lead', name: 'John Doe', role: 'Leader' },
          { id: userId || 'you', name: userName, role: 'Member' }
        ],
        tasks: [],
        feed: []
      };

      const updated = [...groups, foundGroup];
      saveToStorage(updated);
      setSelectedGroup(foundGroup);
      setActiveTab('board');
      
      setJoinCodeInput('');
      setJoinError('');
      setShowJoinModal(false);
    } else {
      setJoinError('Invalid Invite Code structure. Must match SJTXXX format.');
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !taskTitle.trim()) return;

    const newTask: GroupTask = {
      id: 'task_' + Date.now(),
      title: taskTitle,
      column: 'todo',
      priority: taskPriority,
      assignee: taskAssignee || userName,
      dueDate: taskDueDate || 'Flexible',
      notes: taskNotes
    };

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return {
          ...g,
          tasks: [...g.tasks, newTask]
        };
      }
      return g;
    });

    saveToStorage(updatedGroups);
    setShowAddTask(false);
    // Reset Form
    setTaskTitle('');
    setTaskPriority('Medium');
    setTaskAssignee('');
    setTaskDueDate('');
    setTaskNotes('');
  };

  const handleDeleteTask = (taskId: string) => {
    if (!selectedGroup) return;

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return {
          ...g,
          tasks: g.tasks.filter(t => t.id !== taskId)
        };
      }
      return g;
    });

    saveToStorage(updatedGroups);
  };

  const handleMoveTask = (taskId: string, targetCol: 'todo' | 'inprogress' | 'completed') => {
    if (!selectedGroup) return;

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return {
          ...g,
          tasks: g.tasks.map(t => t.id === taskId ? { ...t, column: targetCol } : t)
        };
      }
      return g;
    });

    saveToStorage(updatedGroups);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !feedTitle.trim() || !feedContent.trim()) return;

    const newPost: SharedPost = {
      id: 'post_' + Date.now(),
      author: userName,
      authorRole: 'Contributor',
      type: feedType,
      title: feedTitle,
      summary: feedContent.substring(0, 100) + (feedContent.length > 100 ? '...' : ''),
      content: feedContent,
      timestamp: 'Just now',
      likes: 0,
      comments: []
    };

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return {
          ...g,
          feed: [newPost, ...g.feed]
        };
      }
      return g;
    });

    saveToStorage(updatedGroups);
    setShowAddFeed(false);
    setFeedTitle('');
    setFeedContent('');
  };

  const handleLikePost = (postId: string) => {
    if (!selectedGroup) return;

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return {
          ...g,
          feed: g.feed.map(p => {
            if (p.id === postId) {
              const hasLiked = p.hasLiked;
              return {
                ...p,
                likes: hasLiked ? p.likes - 1 : p.likes + 1,
                hasLiked: !hasLiked
              };
            }
            return p;
          })
        };
      }
      return g;
    });

    saveToStorage(updatedGroups);
  };

  const handleAddComment = (postId: string) => {
    if (!selectedGroup) return;
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    const newComment = {
      author: userName,
      content,
      timestamp: 'Just now'
    };

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return {
          ...g,
          feed: g.feed.map(p => {
            if (p.id === postId) {
              return {
                ...p,
                comments: [...p.comments, newComment]
              };
            }
            return p;
          })
        };
      }
      return g;
    });

    saveToStorage(updatedGroups);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="space-y-6">
      {!selectedGroup ? (
        // LIST OF STUDY GROUPS PANEL
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-amber-500/10 to-primary-500/5 p-6 rounded-2xl border border-primary-500/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-500 rounded-xl text-white shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white-800">Study Collaboration Hub</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Join peers to track, share summaries, and solve topics together.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setShowJoinModal(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Join with Code
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:brightness-110 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Group
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {groups.map((group) => (
              <div 
                key={group.id}
                className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-1 bg-primary-50 dark:bg-slate-700 text-primary-700 dark:text-primary-300 rounded-lg text-xs font-bold font-mono tracking-wide">
                      {group.subject}
                    </span>
                    <button 
                      onClick={() => handleCopyCode(group.inviteCode)}
                      className="p-1 px-2 border border-slate-100 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-800 rounded bg-slate-50 dark:bg-slate-700 flex items-center gap-1.5 transition text-[11px] font-bold text-slate-500 dark:text-slate-300"
                      title="Copy invite code to share with friends"
                    >
                      {copiedCode === group.inviteCode ? (
                        <>
                          <Check className="w-3 h-3 text-green-500 animate-scale" />
                          <span className="text-green-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Code: {group.inviteCode}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 leading-tight">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {group.description}
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5 text-primary-500" />
                    <span>{group.members.length} Members</span>
                    <span className="text-slate-300 mx-1">|</span>
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span>{group.tasks.filter(t => t.column === 'completed').length}/{group.tasks.length} Tasks</span>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedGroup(group);
                      setActiveTab('board');
                    }}
                    className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    Enter Workspace <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // DETAILED GROUP STUDY BOARD VIEW
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          {/* Detailed View Header */}
          <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedGroup(null)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
                title="Back to group list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight flex items-center gap-2">
                  {selectedGroup.name}
                  <span className="text-xs font-mono font-bold text-primary-600 bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 rounded-md">
                    Subject: {selectedGroup.subject}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedGroup.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Invite Code:</span>
              <button 
                onClick={() => handleCopyCode(selectedGroup.inviteCode)}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 px-3 py-1.5 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs rounded-lg flex items-center gap-2 select-all transition text-primary-700 dark:text-primary-400"
              >
                {copiedCode === selectedGroup.inviteCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span>Copied Code</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{selectedGroup.inviteCode}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sub Tab Navigation */}
          <div className="border-b border-slate-100 dark:border-slate-700 flex px-6 py-2 bg-slate-50/50 dark:bg-slate-900/20">
            <button 
              onClick={() => setActiveTab('board')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
                activeTab === 'board'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Task Board
            </button>
            <button 
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
                activeTab === 'feed'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Shared Board & Feed
            </button>
            <button 
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
                activeTab === 'members'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Members ({selectedGroup.members.length})
            </button>
          </div>

          <div className="p-6 flex-1 bg-slate-50/30 dark:bg-slate-800/10 overflow-x-auto">
            {/* TAB 1: TASK KANBAN BOARD */}
            {activeTab === 'board' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary-500" />
                    <span className="text-xs text-slate-500">Assign reading topics, practice formulas, and drag items below.</span>
                  </div>
                  <button 
                    onClick={() => setShowAddTask(true)}
                    className="p-2 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task Card
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Column 1: TODO */}
                  <div className="bg-slate-100/60 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> To Study Index
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {selectedGroup.tasks.filter(t => t.column === 'todo').length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {selectedGroup.tasks.filter(t => t.column === 'todo').map(task => (
                        <div key={task.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 group hover:border-primary-400">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] leading-tight px-1.5 py-0.5 rounded font-black uppercase text-white ${
                                task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'
                              }`}>{task.priority} Priority</span>
                              <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{task.title}</h4>
                            {task.notes && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">{task.notes}</p>}
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-700/50">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Assignee: {task.assignee}</span>
                            <button 
                              onClick={() => handleMoveTask(task.id, 'inprogress')}
                              className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-700 hover:bg-primary-50 text-slate-700 dark:text-slate-300 rounded"
                            >
                              Start &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                      {selectedGroup.tasks.filter(t => t.column === 'todo').length === 0 && (
                        <p className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 bg-white/40 rounded-lg border border-dashed">No topics to study yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Column 2: IN PROGRESS */}
                  <div className="bg-slate-100/60 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary-500 animate-pulse" /> Actively Studying
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {selectedGroup.tasks.filter(t => t.column === 'inprogress').length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {selectedGroup.tasks.filter(t => t.column === 'inprogress').map(task => (
                        <div key={task.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 group hover:border-primary-400">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] leading-tight px-1.5 py-0.5 rounded font-black uppercase text-white ${
                                task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'
                              }`}>{task.priority} Priority</span>
                              <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{task.title}</h4>
                            {task.notes && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">{task.notes}</p>}
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-700/50">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Assignee: {task.assignee}</span>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => handleMoveTask(task.id, 'todo')}
                                className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 hover:bg-slate-200 rounded"
                              >
                                &larr; Back
                              </button>
                              <button 
                                onClick={() => handleMoveTask(task.id, 'completed')}
                                className="px-2 py-1 text-[10px] font-bold bg-green-500 hover:bg-green-600 text-white rounded"
                              >
                                Mastered!
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedGroup.tasks.filter(t => t.column === 'inprogress').length === 0 && (
                        <p className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 bg-white/40 rounded-lg border border-dashed">No active studies currently.</p>
                      )}
                    </div>
                  </div>

                  {/* Column 3: MASTERED */}
                  <div className="bg-slate-100/60 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Mastered index
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {selectedGroup.tasks.filter(t => t.column === 'completed').length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {selectedGroup.tasks.filter(t => t.column === 'completed').map(task => (
                        <div key={task.id} className="bg-green-50/20 dark:bg-green-900/10 border-green-200 p-3.5 rounded-lg border shadow-sm space-y-3 group">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500 font-bold text-white uppercase">Mastered</span>
                              <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <h4 className="text-xs font-bold text-slate-700 dark:text-green-300 leading-snug line-through">{task.title}</h4>
                            {task.notes && <p className="text-[11px] text-slate-400 mt-1 italic">{task.notes}</p>}
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-green-100 dark:border-green-800">
                            <span className="text-[10px] text-slate-500 dark:text-green-400 font-medium">Verified: {task.assignee}</span>
                            <button 
                              onClick={() => handleMoveTask(task.id, 'inprogress')}
                              className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border rounded"
                            >
                              Restart Study
                            </button>
                          </div>
                        </div>
                      ))}
                      {selectedGroup.tasks.filter(t => t.column === 'completed').length === 0 && (
                        <p className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 bg-white/40 rounded-lg border border-dashed">No topics mastered yet. Solve homework and quizzes to populate!</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RESOURCE SHARING FEED */}
            {activeTab === 'feed' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-primary-500" />
                    <span className="text-slate-500 text-xs font-medium">Browse, review, and comment on summaries/notes shared by group members.</span>
                  </div>
                  <button 
                    onClick={() => setShowAddFeed(true)}
                    className="p-2 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold"
                  >
                    Post / Share Note
                  </button>
                </div>

                <div className="space-y-5">
                  {selectedGroup.feed.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notes shared in this feed yet. Be the first to publish!</p>
                    </div>
                  ) : (
                    selectedGroup.feed.map((post) => (
                      <div key={post.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary-500 text-white text-[10px] font-black flex items-center justify-center">
                              {post.author.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-800 dark:text-white leading-normal flex items-center gap-1.5">
                                {post.author}
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-black tracking-wide text-slate-500">
                                  {post.authorRole}
                                </span>
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium">{post.timestamp}</p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${
                            post.type === 'Summary' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 
                            post.type === 'Quiz Result' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' :
                            post.type === 'Question' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                          }`}>
                            {post.type}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1.5">{post.title}</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        </div>

                        {/* Likes & Actions */}
                        <div className="flex items-center gap-4 border-t border-b border-slate-50 dark:border-slate-700/50 py-2.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          <button 
                            onClick={() => handleLikePost(post.id)}
                            className={`flex items-center gap-1.5 transition ${
                              post.hasLiked ? 'text-primary-600' : 'hover:text-slate-800 dark:hover:text-white'
                            }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${post.hasLiked ? 'fill-current' : ''}`} />
                            <span>{post.likes} Likes</span>
                          </button>
                          
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{post.comments.length} Discussion/Comments</span>
                          </div>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-3 pl-3 pt-1 border-l-2 border-slate-100 dark:border-slate-700">
                          {post.comments.map((comment, index) => (
                            <div key={index} className="text-xs bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-lg space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700 dark:text-white">{comment.author}</span>
                                <span className="text-[10px] text-slate-400">{comment.timestamp}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 font-medium">{comment.content}</p>
                            </div>
                          ))}

                          <div className="flex gap-2 pt-1">
                            <input 
                              type="text" 
                              placeholder="Type a comments, explanation writeup or solution doubt..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              className="flex-1 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary-400 focus:outline-none"
                            />
                            <button 
                              onClick={() => handleAddComment(post.id)}
                              className="px-3 bg-slate-800 dark:bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: MEMBERS */}
            {activeTab === 'members' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4">Study Members</h3>
                  <div className="space-y-3.5">
                    {selectedGroup.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white">{member.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Academic Study Contributor</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          member.role === 'Leader' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20' : 'bg-slate-100 text-slate-600 dark:bg-slate-700'
                        }`}>
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create Study Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-black">✕</button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Group Display Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. CBSE 10th Science Study Hub"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Focus Subject</label>
                <input 
                  type="text" 
                  placeholder="e.g. Physics & Trigonometry"
                  value={newGroupSubject}
                  onChange={(e) => setNewGroupSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Brief Description / Study Goals</label>
                <textarea 
                  placeholder="e.g. Preparing chapters 10-14 for monthly boards. Solving MCQs and sharing formulas."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none h-24 resize-none"
                />
              </div>

              <div className="flex gap-3.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:brightness-110 text-white rounded-xl font-bold text-sm shadow-md transition"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN GROUP MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Join Study Group</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-slate-600 font-black">✕</button>
            </div>

            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Enter Group Invite Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. SJT842"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  maxLength={6}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest focus:ring-1 focus:ring-primary-500 focus:outline-none uppercase"
                  required
                />
                {joinError && <p className="text-red-500 text-[11px] mt-1.5 font-bold">{joinError}</p>}
                
                <div className="p-3.5 bg-primary-50/50 dark:bg-slate-700 rounded-xl border border-primary-100 dark:border-slate-600 text-[11px] text-slate-500 mt-3 font-medium">
                  <strong>PRO-TIP:</strong> Want to test right away without another device? Type invite code <code className="font-black bg-white dark:bg-slate-800 text-primary-700 px-1 py-0.5 rounded border">SJT500</code> to join Rohan&apos;s custom Math group!
                </div>
              </div>

              <div className="flex gap-3.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:brightness-110 text-white rounded-xl font-bold text-sm shadow-md transition"
                >
                  Verify & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TASK MODAL */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Add Group Task Card</h3>
              <button onClick={() => setShowAddTask(false)} className="text-slate-400 hover:text-slate-600 font-black">✕</button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Task Description / Topic Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Complete chapter 3 formulas and mock problems"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Study Priority</label>
                  <select 
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Due Date</label>
                  <input 
                    type="text" 
                    placeholder="e.g. By Friday"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Assignee</label>
                <select 
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="">Choose partner...</option>
                  {selectedGroup.members.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Additional Notes (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mirror equations must be written separately."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:brightness-110 text-white rounded-xl font-bold text-sm shadow-md transition"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE POST MODAL */}
      {showAddFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Share / Post Study Material</h3>
              <button onClick={() => setShowAddFeed(false)} className="text-slate-400 hover:text-slate-600 font-black">✕</button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <button 
                  type="button"
                  onClick={() => setFeedType('Note')}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    feedType === 'Note' ? 'bg-emerald-50 dark:bg-emerald-990 border-emerald-500 text-emerald-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  General Note
                </button>
                <button 
                  type="button"
                  onClick={() => setFeedType('Summary')}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    feedType === 'Summary' ? 'bg-amber-50 dark:bg-amber-990 border-amber-500 text-amber-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Summary / Tip
                </button>
                <button 
                  type="button"
                  onClick={() => setFeedType('Question')}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    feedType === 'Question' ? 'bg-rose-50 dark:bg-rose-990 border-rose-500 text-rose-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Academic Doubt
                </button>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Note Topic Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Quick summary of Ohm\'s law rules..."
                  value={feedTitle}
                  onChange={(e) => setFeedTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 text-slate-400">Content / Explanatory Text</label>
                <textarea 
                  placeholder="Insert equations, lists, and reference text that others in this study board should master..."
                  value={feedContent}
                  onChange={(e) => setFeedContent(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none h-36 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddFeed(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:brightness-110 text-white rounded-xl font-bold text-sm shadow-md transition"
                >
                  Post to Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
