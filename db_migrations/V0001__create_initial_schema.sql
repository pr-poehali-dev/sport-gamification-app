CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_points INTEGER DEFAULT 0,
    week_workouts INTEGER DEFAULT 0,
    week_start_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS athlete_cards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic')),
    image_url TEXT,
    fact TEXT NOT NULL,
    sport VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    card_id INTEGER REFERENCES athlete_cards(id),
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 4),
    was_weekly_bonus BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, card_id, obtained_at)
);

CREATE TABLE IF NOT EXISTS workout_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 4),
    card_id INTEGER REFERENCES athlete_cards(id),
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_user_id ON workout_history(user_id);
