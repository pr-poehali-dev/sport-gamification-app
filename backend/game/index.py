import json
import os
import psycopg2
import random
from datetime import datetime, date

def handler(event: dict, context) -> dict:
    '''API для игровой механики: завершение тренировок, получение карточек, просмотр коллекции'''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    query_params = event.get('queryStringParameters', {})
    action = query_params.get('action', '')
    
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        if method == 'POST' and action == 'complete-workout':
            return complete_workout(event, cur, conn)
        elif method == 'GET' and action == 'collection':
            return get_collection(event, cur)
        elif method == 'GET' and action == 'leaderboard':
            return get_leaderboard(cur)
        elif method == 'GET' and action == 'stats':
            return get_user_stats(event, cur)
        else:
            cur.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Endpoint not found'}),
                'isBase64Encoded': False
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def complete_workout(event: dict, cur, conn) -> dict:
    body = json.loads(event.get('body', '{}'))
    user_id = body.get('userId')
    difficulty = body.get('difficulty')
    
    if not user_id or not difficulty:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'userId and difficulty are required'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "SELECT week_workouts, week_start_date FROM users WHERE id = %s",
        (user_id,)
    )
    user_data = cur.fetchone()
    
    if not user_data:
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'User not found'}),
            'isBase64Encoded': False
        }
    
    week_workouts, week_start = user_data
    today = date.today()
    
    if week_start and (today - week_start).days >= 7:
        week_workouts = 0
        week_start = today
    
    is_weekly_bonus = (week_workouts == 2)
    
    rarity_chances = {
        1: {'common': 80, 'rare': 15, 'epic': 5},
        2: {'common': 70, 'rare': 20, 'epic': 10},
        3: {'common': 60, 'rare': 25, 'epic': 15},
        4: {'common': 50, 'rare': 30, 'epic': 20}
    }
    
    if is_weekly_bonus:
        chosen_rarity = 'epic'
    else:
        chances = rarity_chances[difficulty]
        rand = random.random() * 100
        
        if rand < chances['common']:
            chosen_rarity = 'common'
        elif rand < chances['common'] + chances['rare']:
            chosen_rarity = 'rare'
        else:
            chosen_rarity = 'epic'
    
    cur.execute(
        "SELECT id, name, rarity, image_url, fact, sport FROM athlete_cards WHERE rarity = %s ORDER BY RANDOM() LIMIT 1",
        (chosen_rarity,)
    )
    card = cur.fetchone()
    
    if not card:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'No cards available'}),
            'isBase64Encoded': False
        }
    
    card_id, name, rarity, image_url, fact, sport = card
    
    points_map = {'common': 10, 'rare': 20, 'epic': 30}
    points = points_map[rarity]
    
    cur.execute(
        "INSERT INTO user_cards (user_id, card_id, difficulty_level, was_weekly_bonus) VALUES (%s, %s, %s, %s)",
        (user_id, card_id, difficulty, is_weekly_bonus)
    )
    
    cur.execute(
        "INSERT INTO workout_history (user_id, difficulty_level, card_id) VALUES (%s, %s, %s)",
        (user_id, difficulty, card_id)
    )
    
    new_week_workouts = (week_workouts + 1) % 3
    
    cur.execute(
        "UPDATE users SET total_points = total_points + %s, week_workouts = %s, week_start_date = %s WHERE id = %s",
        (points, new_week_workouts, week_start, user_id)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'card': {
                'id': card_id,
                'name': name,
                'rarity': rarity,
                'imageUrl': image_url,
                'fact': fact,
                'sport': sport
            },
            'points': points,
            'weekWorkouts': new_week_workouts,
            'wasWeeklyBonus': is_weekly_bonus
        }),
        'isBase64Encoded': False
    }

def get_collection(event: dict, cur) -> dict:
    params = event.get('queryStringParameters', {})
    user_id = params.get('userId')
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'userId is required'}),
            'isBase64Encoded': False
        }
    
    cur.execute("""
        SELECT ac.id, ac.name, ac.rarity, ac.image_url, ac.fact, ac.sport, uc.obtained_at
        FROM user_cards uc
        JOIN athlete_cards ac ON uc.card_id = ac.id
        WHERE uc.user_id = %s
        ORDER BY uc.obtained_at DESC
    """, (user_id,))
    
    cards = []
    for row in cur.fetchall():
        cards.append({
            'id': row[0],
            'name': row[1],
            'rarity': row[2],
            'imageUrl': row[3],
            'fact': row[4],
            'sport': row[5],
            'obtainedAt': row[6].isoformat() if row[6] else None
        })
    
    cur.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'cards': cards}),
        'isBase64Encoded': False
    }

def get_leaderboard(cur) -> dict:
    cur.execute("""
        SELECT u.id, u.phone, u.total_points, COUNT(uc.id) as card_count
        FROM users u
        LEFT JOIN user_cards uc ON u.id = uc.user_id
        GROUP BY u.id
        ORDER BY u.total_points DESC
        LIMIT 100
    """)
    
    leaderboard = []
    for idx, row in enumerate(cur.fetchall(), start=1):
        leaderboard.append({
            'rank': idx,
            'userId': row[0],
            'phone': row[1][-4:] if row[1] else '****',
            'points': row[2],
            'cardCount': row[3]
        })
    
    cur.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'leaderboard': leaderboard}),
        'isBase64Encoded': False
    }

def get_user_stats(event: dict, cur) -> dict:
    params = event.get('queryStringParameters', {})
    user_id = params.get('userId')
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'userId is required'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "SELECT total_points, week_workouts FROM users WHERE id = %s",
        (user_id,)
    )
    user = cur.fetchone()
    
    if not user:
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'User not found'}),
            'isBase64Encoded': False
        }
    
    cur.execute("""
        SELECT ac.rarity, COUNT(*) 
        FROM user_cards uc
        JOIN athlete_cards ac ON uc.card_id = ac.id
        WHERE uc.user_id = %s
        GROUP BY ac.rarity
    """, (user_id,))
    
    rarity_counts = {'common': 0, 'rare': 0, 'epic': 0}
    for row in cur.fetchall():
        rarity_counts[row[0]] = row[1]
    
    cur.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'totalPoints': user[0],
            'weekWorkouts': user[1],
            'rarityStats': rarity_counts
        }),
        'isBase64Encoded': False
    }