CREATE TABLE IF NOT EXISTS verification_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_verification_phone ON verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_codes(expires_at);
