const AUTH_URL = 'https://functions.poehali.dev/6bf98199-0a57-4d98-9ca1-73bad291f931';
const GAME_URL = 'https://functions.poehali.dev/e790ef55-3302-47ea-9839-00bd07a7963d';

export interface User {
  userId: number;
  phone: string;
  totalPoints: number;
  weekWorkouts: number;
}

export interface AthleteCard {
  id: number;
  name: string;
  rarity: 'common' | 'rare' | 'epic';
  imageUrl: string | null;
  fact: string;
  sport: string;
  obtainedAt?: string;
}

export interface WorkoutResult {
  card: AthleteCard;
  points: number;
  weekWorkouts: number;
  wasWeeklyBonus: boolean;
}

export interface UserStats {
  totalPoints: number;
  weekWorkouts: number;
  rarityStats: {
    common: number;
    rare: number;
    epic: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  phone: string;
  points: number;
  cardCount: number;
}

export const api = {
  async login(phone: string): Promise<User> {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  },

  async completeWorkout(userId: number, difficulty: number): Promise<WorkoutResult> {
    const response = await fetch(`${GAME_URL}?action=complete-workout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, difficulty }),
    });

    if (!response.ok) {
      throw new Error('Workout completion failed');
    }

    return response.json();
  },

  async getCollection(userId: number): Promise<AthleteCard[]> {
    const response = await fetch(`${GAME_URL}?action=collection&userId=${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch collection');
    }

    const data = await response.json();
    return data.cards;
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const response = await fetch(`${GAME_URL}?action=leaderboard`);

    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }

    const data = await response.json();
    return data.leaderboard;
  },

  async getUserStats(userId: number): Promise<UserStats> {
    const response = await fetch(`${GAME_URL}?action=stats&userId=${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user stats');
    }

    return response.json();
  },
};
