/**
 * Personal AI Assistant for Individual Users
 * Real AI integration for personal productivity and life management
 */

import { openai, elevenlabs, withRetry, costTracker, API_LIMITS, AI_MODELS } from '../ai/real-integrations';
import { supabase } from '../ai/real-integrations';

export interface PersonalProfile {
  id: string;
  name: string;
  email: string;
  preferences: {
    communicationStyle: "formal" | "casual" | "friendly" | "professional";
    workingHours: { start: string; end: string };
    timezone: string;
    language: string;
    interests: string[];
    goals: PersonalGoal[];
    habits: DailyHabit[];
  };
  data: {
    calendar: CalendarEvent[];
    tasks: Task[];
    notes: Note[];
    contacts: Contact[];
    finances: PersonalFinance[];
    health: HealthMetrics[];
  };
}

export interface PersonalGoal {
  id: string;
  title: string;
  description: string;
  category: "career" | "health" | "finance" | "learning" | "relationships" | "personal";
  targetDate: string;
  progress: number;
  milestones: Milestone[];
  priority: "low" | "medium" | "high";
}

export interface DailyHabit {
  id: string;
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly";
  streak: number;
  completedToday: boolean;
  timeOfDay: "morning" | "afternoon" | "evening";
  reminderTime?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: string[];
  type: "meeting" | "appointment" | "reminder" | "deadline";
  priority: "low" | "medium" | "high";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "completed";
  tags: string[];
  estimatedTime?: number;
  subtasks: SubTask[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category: string;
  isPinned: boolean;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  relationship: string;
  lastContact: string;
  notes: string;
  importantDates: Array<{ type: string; date: string; description: string }>;
}

export interface PersonalFinance {
  id: string;
  type: "income" | "expense" | "savings" | "investment";
  amount: number;
  category: string;
  description: string;
  date: string;
  recurring: boolean;
  account: string;
}

export interface HealthMetrics {
  id: string;
  date: string;
  weight?: number;
  steps?: number;
  sleep?: { hours: number; quality: number };
  exercise?: { minutes: number; type: string };
  mood?: number; // 1-10 scale
  stress?: number; // 1-10 scale
  vitals?: {
    heartRate?: number;
    bloodPressure?: { systolic: number; diastolic: number };
  };
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  completed: boolean;
  completedDate?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Personal AI Assistant Class
 */
export class PersonalAIAssistant {
  private profile: PersonalProfile;
  
  constructor(userId: string) {
    this.loadProfile(userId);
  }

  /**
   * Load user profile from database
   */
  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('personal_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw new Error(`Failed to load profile: ${error.message}`);
    if (!data) throw new Error('Profile not found');
    
    this.profile = data;
  }

  /**
   * Generate daily plan using AI
   */
  async generateDailyPlan(date: string): Promise<{
    schedule: ScheduleItem[];
    priorities: string[];
    recommendations: string[];
    motivation: string;
  }> {
    try {
      // Get today's events and tasks
      const todayEvents = this.profile.data.calendar.filter(event => 
        event.startTime.startsWith(date)
      );
      const todayTasks = this.profile.data.tasks.filter(task => 
        !task.dueDate || task.dueDate.startsWith(date)
      );

      // Generate AI-powered daily plan
      const plan = await withRetry(async () => {
        const response = await openai.chat.completions.create({
          model: AI_MODELS.GPT_4_TURBO,
          messages: [
            {
              role: 'system',
              content: `You are a personal AI assistant creating a daily plan for ${this.profile.name}.
              Consider their:
              - Working hours: ${this.profile.preferences.workingHours.start} - ${this.profile.preferences.workingHours.end}
              - Goals: ${this.profile.preferences.goals.map(g => g.title).join(', ')}
              - Habits: ${this.profile.preferences.habits.map(h => h.name).join(', ')}
              - Communication style: ${this.profile.preferences.communicationStyle}
              
              Create a structured daily plan with:
              1. Time-blocked schedule
              2. Top 3 priorities
              3. Personalized recommendations
              4. Motivational message
              
              Be encouraging and realistic.`
            },
            {
              role: 'user',
              content: `Create daily plan for ${date} with these events: ${JSON.stringify(todayEvents)} and tasks: ${JSON.stringify(todayTasks)}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        // Track cost
        costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

        return JSON.parse(response.choices[0]?.message?.content || '{}');
      });

      return plan;
    } catch (error) {
      console.error('Daily plan generation failed:', error);
      throw new Error(`Failed to generate daily plan: ${error.message}`);
    }
  }

  /**
   * Provide personalized advice using AI
   */
  async getPersonalizedAdvice(
    topic: string,
    context?: string
  ): Promise<{
    advice: string;
    actionItems: string[];
    resources: Array<{ title: string; url: string; type: string }>;
    followUp: string;
  }> {
    try {
      const advice = await withRetry(async () => {
        const response = await openai.chat.completions.create({
          model: AI_MODELS.GPT_4_TURBO,
          messages: [
            {
              role: 'system',
              content: `You are a personal AI life coach for ${this.profile.name}.
              Their profile:
              - Goals: ${this.profile.preferences.goals.map(g => `${g.title} (${g.progress}% complete)`).join(', ')}
              - Interests: ${this.profile.preferences.interests.join(', ')}
              - Communication style: ${this.profile.preferences.communicationStyle}
              
              Provide personalized, actionable advice that considers their specific goals and personality.
              Be encouraging but realistic. Include specific action steps and helpful resources.`
            },
            {
              role: 'user',
              content: `Provide advice about: ${topic}${context ? `\n\nContext: ${context}` : ''}`
            }
          ],
          max_tokens: 800,
          temperature: 0.6,
        });

        // Track cost
        costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

        return JSON.parse(response.choices[0]?.message?.content || '{}');
      });

      return advice;
    } catch (error) {
      console.error('Advice generation failed:', error);
      throw new Error(`Failed to generate advice: ${error.message}`);
    }
  }

  /**
   * Analyze progress on goals
   */
  async analyzeGoalProgress(): Promise<{
    overallProgress: number;
    goalAnalysis: Array<{
      goal: PersonalGoal;
      progress: number;
      insights: string[];
      recommendations: string[];
      nextSteps: string[];
    }>;
    motivation: string;
  }> {
    try {
      const analysis = await withRetry(async () => {
        const response = await openai.chat.completions.create({
          model: AI_MODELS.GPT_4_TURBO,
          messages: [
            {
              role: 'system',
              content: `Analyze goal progress for ${this.profile.name}. 
              Provide insights on:
              - Overall progress trends
              - Goal-specific analysis
              - Personalized recommendations
              - Motivational feedback
              
              Be data-driven but encouraging. Focus on actionable insights.`
            },
            {
              role: 'user',
              content: `Analyze progress on these goals: ${JSON.stringify(this.profile.preferences.goals)}`
            }
          ],
          max_tokens: 1200,
          temperature: 0.5,
        });

        // Track cost
        costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

        return JSON.parse(response.choices[0]?.message?.content || '{}');
      });

      return analysis;
    } catch (error) {
      console.error('Goal analysis failed:', error);
      throw new Error(`Failed to analyze goals: ${error.message}`);
    }
  }

  /**
   * Generate habit recommendations
   */
  async generateHabitRecommendations(): Promise<{
    newHabits: Array<{
      name: string;
      description: string;
      benefit: string;
      difficulty: "easy" | "medium" | "hard";
      timeCommitment: string;
    }>;
    habitOptimizations: Array<{
      habit: string;
      suggestion: string;
      reason: string;
    }>;
  }> {
    try {
      const recommendations = await withRetry(async () => {
        const response = await openai.chat.completions.create({
          model: AI_MODELS.GPT_4_TURBO,
          messages: [
            {
              role: 'system',
              content: `Suggest personalized habits for ${this.profile.name} based on:
              - Current goals: ${this.profile.preferences.goals.map(g => g.title).join(', ')}
              - Current habits: ${this.profile.preferences.habits.map(h => h.name).join(', ')}
              - Interests: ${this.profile.preferences.interests.join(', ')}
              
              Suggest habits that:
              - Support their goals
              - Match their interests
              - Are realistic to implement
              - Have clear benefits
              
              Also suggest optimizations for existing habits.`
            },
            {
              role: 'user',
              content: 'Generate personalized habit recommendations'
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        // Track cost
        costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

        return JSON.parse(response.choices[0]?.message?.content || '{}');
      });

      return recommendations;
    } catch (error) {
      console.error('Habit recommendations failed:', error);
      throw new Error(`Failed to generate habit recommendations: ${error.message}`);
    }
  }

  /**
   * Process natural language commands
   */
  async processCommand(command: string): Promise<{
    action: string;
    result: any;
    confirmation: string;
  }> {
    try {
      const result = await withRetry(async () => {
        const response = await openai.chat.completions.create({
          model: AI_MODELS.GPT_4_TURBO,
          messages: [
            {
              role: 'system',
              content: `You are a personal AI assistant for ${this.profile.name}.
              Parse natural language commands and execute appropriate actions.
              
              Available actions:
              - add_task: Add new task
              - schedule_event: Add calendar event
              - set_reminder: Set reminder
              - update_goal: Update goal progress
              - log_habit: Mark habit as complete
              - add_note: Create note
              - track_expense: Log expense
              - get_advice: Provide advice
              
              Return JSON with action, parameters, and confirmation message.`
            },
            {
              role: 'user',
              content: command
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
          functions: [
            {
              name: 'execute_command',
              description: 'Execute parsed command',
              parameters: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  parameters: { type: 'object' },
                  confirmation: { type: 'string' }
                }
              }
            }
          ],
        });

        // Track cost
        costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

        return JSON.parse(response.choices[0]?.message?.content || '{}');
      });

      // Execute the action
      const actionResult = await this.executeAction(result.action, result.parameters);

      return {
        action: result.action,
        result: actionResult,
        confirmation: result.confirmation,
      };
    } catch (error) {
      console.error('Command processing failed:', error);
      throw new Error(`Failed to process command: ${error.message}`);
    }
  }

  /**
   * Execute parsed action
   */
  private async executeAction(action: string, parameters: any): Promise<any> {
    switch (action) {
      case 'add_task':
        return await this.addTask(parameters);
      case 'schedule_event':
        return await this.scheduleEvent(parameters);
      case 'set_reminder':
        return await this.setReminder(parameters);
      case 'update_goal':
        return await this.updateGoal(parameters);
      case 'log_habit':
        return await this.logHabit(parameters);
      case 'add_note':
        return await this.addNote(parameters);
      case 'track_expense':
        return await this.trackExpense(parameters);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Add new task
   */
  private async addTask(params: any): Promise<Task> {
    const newTask: Task = {
      id: Date.now().toString(),
      title: params.title,
      description: params.description || '',
      priority: params.priority || 'medium',
      status: 'todo',
      tags: params.tags || [],
      dueDate: params.dueDate,
      estimatedTime: params.estimatedTime,
      subtasks: [],
    };

    // Save to database
    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();

    if (error) throw new Error(`Failed to add task: ${error.message}`);

    // Update local profile
    this.profile.data.tasks.push(newTask);

    return data;
  }

  /**
   * Schedule calendar event
   */
  private async scheduleEvent(params: any): Promise<CalendarEvent> {
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: params.title,
      description: params.description || '',
      startTime: params.startTime,
      endTime: params.endTime,
      location: params.location,
      type: params.type || 'meeting',
      priority: params.priority || 'medium',
      attendees: params.attendees || [],
    };

    // Save to database
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(newEvent)
      .select()
      .single();

    if (error) throw new Error(`Failed to schedule event: ${error.message}`);

    // Update local profile
    this.profile.data.calendar.push(newEvent);

    return data;
  }

  /**
   * Generate voice response
   */
  async generateVoiceResponse(text: string): Promise<string> {
    try {
      const response = await elevenlabs.generate({
        voice: 'rachel', // Can be personalized based on user preference
        text: text,
        model_id: AI_MODELS.ELEVEN_MULTILINGUAL_V2,
      });

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('voice_responses')
        .upload(`${Date.now()}.mp3`, response.audio);

      if (error) throw new Error(`Failed to save voice response: ${error.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('voice_responses')
        .getPublicUrl(data.path);

      // Track cost
      costTracker.trackCost('elevenlabs', text.length, API_LIMITS.ELEVENLABS.COST_PER_1K_CHARS);

      return publicUrl;
    } catch (error) {
      console.error('Voice generation failed:', error);
      throw new Error(`Failed to generate voice response: ${error.message}`);
    }
  }

  /**
   * Get personalized insights
   */
  async getPersonalizedInsights(): Promise<{
    productivity: ProductivityInsight;
    wellbeing: WellbeingInsight;
    goals: GoalInsight;
    habits: HabitInsight;
    recommendations: string[];
  }> {
    try {
      const insights = await withRetry(async () => {
        const response = await openai.chat.completions.create({
          model: AI_MODELS.GPT_4_TURBO,
          messages: [
            {
              role: 'system',
              content: `Analyze ${this.profile.name}'s data and provide personalized insights:
              
              Data to analyze:
              - Tasks: ${this.profile.data.tasks.length} tasks
              - Goals: ${JSON.stringify(this.profile.preferences.goals)}
              - Habits: ${JSON.stringify(this.profile.preferences.habits)}
              - Recent events: ${this.profile.data.calendar.slice(-5).map(e => e.title).join(', ')}
              
              Provide insights on:
              1. Productivity patterns
              2. Wellbeing indicators
              3. Goal progress analysis
              4. Habit consistency
              5. Personalized recommendations
              
              Be supportive and actionable.`
            },
            {
              role: 'user',
              content: 'Generate personalized insights'
            }
          ],
          max_tokens: 1500,
          temperature: 0.6,
        });

        // Track cost
        costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

        return JSON.parse(response.choices[0]?.message?.content || '{}');
      });

      return insights;
    } catch (error) {
      console.error('Insights generation failed:', error);
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }

  // Additional helper methods would be implemented here...
  private async setReminder(params: any): Promise<any> { /* Implementation */ }
  private async updateGoal(params: any): Promise<any> { /* Implementation */ }
  private async logHabit(params: any): Promise<any> { /* Implementation */ }
  private async addNote(params: any): Promise<any> { /* Implementation */ }
  private async trackExpense(params: any): Promise<any> { /* Implementation */ }
}

// Type definitions for insights
interface ScheduleItem {
  time: string;
  title: string;
  type: string;
  priority: string;
}

interface ProductivityInsight {
  score: number;
  trends: string[];
  peakHours: string[];
  suggestions: string[];
}

interface WellbeingInsight {
  overall: number;
  stress: number;
  sleep: number;
  mood: number;
  recommendations: string[];
}

interface GoalInsight {
  onTrack: number;
  atRisk: number;
  completed: number;
  recommendations: string[];
}

interface HabitInsight {
  consistency: number;
  streaks: Array<{ habit: string; days: number }>;
  improvements: string[];
}
