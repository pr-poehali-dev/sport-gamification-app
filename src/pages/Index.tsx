import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api, AthleteCard as APIAthleteCard, LeaderboardEntry } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type CardRarity = 'common' | 'rare' | 'epic';

interface AthleteCard extends APIAthleteCard {
  image?: string;
}

const rarityChances = {
  1: { common: 80, rare: 15, epic: 5 },
  2: { common: 70, rare: 20, epic: 10 },
  3: { common: 60, rare: 25, epic: 15 },
  4: { common: 50, rare: 30, epic: 20 },
};

const rarityPoints = {
  common: 10,
  rare: 20,
  epic: 30,
};

const rarityColors = {
  common: 'bg-common/20 border-common text-common',
  rare: 'bg-rare/20 border-rare text-rare',
  epic: 'bg-epic/20 border-epic text-epic',
};

const rarityGradients = {
  common: 'from-common/30 to-common/5',
  rare: 'from-rare/30 to-rare/5',
  epic: 'from-epic/30 to-epic/5',
};

const sportEmojis: { [key: string]: string } = {
  'Борьба': '🤼',
  'Лёгкая атлетика': '🏃‍♀️',
  'Фигурное катание': '⛸️',
  'Хоккей': '🏒',
  'Теннис': '🎾',
  'Бокс': '🥊',
  'Плавание': '🏊',
  'Гимнастика': '🤸',
  'Прыжки в воду': '🤿',
  'Волейбол': '🏐',
  'Синхронное плавание': '💦',
  'Лыжные гонки': '⛷️',
};

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(true);
  const [phone, setPhone] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [userCards, setUserCards] = useState<AthleteCard[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [weekProgress, setWeekProgress] = useState({ completed: 0, total: 3 });
  const [showCardReveal, setShowCardReveal] = useState(false);
  const [revealedCard, setRevealedCard] = useState<AthleteCard | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const { toast } = useToast();

  const difficultyLevels = [
    { level: 1, title: 'Новичок', desc: 'Первые шаги в спорте', icon: 'Sprout' },
    { level: 2, title: 'Поддержание формы', desc: 'Лёгкие тренировки', icon: 'Heart' },
    { level: 3, title: 'Прогресс', desc: 'Наращивание силы', icon: 'TrendingUp' },
    { level: 4, title: 'Подготовка к ГТО', desc: 'Максимум усилий', icon: 'Trophy' },
  ];

  const motivationalTips = [
    '🔥 Постоянство важнее интенсивности',
    '💪 Каждая тренировка — шаг к цели',
    '⚡ Сильные не сдаются, а сдающиеся никогда не становятся сильными',
    '🎯 Ты сильнее, чем думаешь',
    '✨ Результаты приходят к тем, кто не останавливается',
  ];

  useEffect(() => {
    const savedPhone = localStorage.getItem('userPhone');
    const savedUserId = localStorage.getItem('userId');
    
    if (savedPhone && savedUserId) {
      setPhone(savedPhone);
      setUserId(parseInt(savedUserId));
      setIsAuthenticated(true);
      setShowLoginDialog(false);
      loadUserData(parseInt(savedUserId));
    }
  }, []);

  const loadUserData = async (uid: number) => {
    try {
      const [stats, collection, leaderboardData] = await Promise.all([
        api.getUserStats(uid),
        api.getCollection(uid),
        api.getLeaderboard(),
      ]);

      setTotalPoints(stats.totalPoints);
      setWeekProgress({ completed: stats.weekWorkouts, total: 3 });
      
      const cardsWithEmojis = collection.map(card => ({
        ...card,
        image: sportEmojis[card.sport] || '🏅',
      }));
      setUserCards(cardsWithEmojis);
      setLeaderboard(leaderboardData);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive',
      });
    }
  };

  const handleLogin = async () => {
    if (!phone.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите номер телефона',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const user = await api.login(phone);
      setUserId(user.userId);
      setTotalPoints(user.totalPoints);
      setWeekProgress({ completed: user.weekWorkouts, total: 3 });
      
      localStorage.setItem('userPhone', phone);
      localStorage.setItem('userId', user.userId.toString());
      
      setIsAuthenticated(true);
      setShowLoginDialog(false);
      
      await loadUserData(user.userId);
      
      toast({
        title: 'Добро пожаловать!',
        description: 'Вы успешно вошли в систему',
      });
    } catch (error) {
      toast({
        title: 'Ошибка входа',
        description: 'Попробуйте ещё раз',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeWorkout = async () => {
    if (selectedDifficulty === null || userId === null) return;

    setIsLoading(true);
    try {
      const result = await api.completeWorkout(userId, selectedDifficulty);
      
      const cardWithEmoji: AthleteCard = {
        ...result.card,
        image: sportEmojis[result.card.sport] || '🏅',
      };
      
      setRevealedCard(cardWithEmoji);
      setShowCardReveal(true);
      setIsFlipping(true);

      setTimeout(() => {
        setIsFlipping(false);
        setUserCards([cardWithEmoji, ...userCards]);
        setTotalPoints(totalPoints + result.points);
        setWeekProgress({
          completed: result.weekWorkouts,
          total: 3
        });
        
        if (result.wasWeeklyBonus) {
          toast({
            title: '🎉 Недельный бонус!',
            description: 'Вы получили эпическую карточку за 3 тренировки!',
          });
        }
      }, 600);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось завершить тренировку',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const rarityStats = {
    common: userCards.filter(c => c.rarity === 'common').length,
    rare: userCards.filter(c => c.rarity === 'rare').length,
    epic: userCards.filter(c => c.rarity === 'epic').length,
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading">Добро пожаловать в SportCards!</DialogTitle>
            <DialogDescription>
              Введите номер телефона для входа или регистрации
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl font-heading font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            SportCards
          </h1>
          <p className="text-muted-foreground text-lg">Геймификация спорта через коллекционирование</p>
        </header>

        <Tabs defaultValue="training" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-14">
            <TabsTrigger value="training" className="text-base">
              <Icon name="Dumbbell" size={18} className="mr-2" />
              Тренировки
            </TabsTrigger>
            <TabsTrigger value="collection" className="text-base">
              <Icon name="Library" size={18} className="mr-2" />
              Коллекция
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-base">
              <Icon name="User" size={18} className="mr-2" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-base">
              <Icon name="BarChart3" size={18} className="mr-2" />
              Рейтинг
            </TabsTrigger>
          </TabsList>

          <TabsContent value="training" className="space-y-8 animate-fade-in">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-heading font-bold mb-2">Прогресс недели</h3>
                    <p className="text-muted-foreground">Тренировок завершено: {weekProgress.completed}/3</p>
                  </div>
                  {weekProgress.completed === 3 && (
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      <Icon name="Gift" size={20} className="mr-2" />
                      Недельный бонус доступен!
                    </Badge>
                  )}
                </div>
                <Progress value={(weekProgress.completed / weekProgress.total) * 100} className="h-3" />
              </CardContent>
            </Card>

            <div>
              <h3 className="text-3xl font-heading font-bold mb-6">Выберите уровень сложности</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {difficultyLevels.map((diff) => (
                  <Card
                    key={diff.level}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 card-shine ${
                      selectedDifficulty === diff.level ? 'ring-4 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedDifficulty(diff.level)}
                  >
                    <CardContent className="pt-6 text-center">
                      <div className="mb-4 flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon name={diff.icon as any} size={32} className="text-primary" />
                        </div>
                      </div>
                      <h4 className="text-xl font-heading font-bold mb-2">{diff.title}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{diff.desc}</p>
                      <div className="flex gap-2 justify-center text-xs">
                        <Badge variant="outline" className={rarityColors.common}>
                          {rarityChances[diff.level as keyof typeof rarityChances].common}%
                        </Badge>
                        <Badge variant="outline" className={rarityColors.rare}>
                          {rarityChances[diff.level as keyof typeof rarityChances].rare}%
                        </Badge>
                        <Badge variant="outline" className={rarityColors.epic}>
                          {rarityChances[diff.level as keyof typeof rarityChances].epic}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                className="text-xl px-12 py-6 font-heading font-bold"
                disabled={selectedDifficulty === null || isLoading}
                onClick={completeWorkout}
              >
                <Icon name="Play" size={24} className="mr-3" />
                {isLoading ? 'Тренировка...' : 'Начать тренировку'}
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-heading font-bold mb-4 flex items-center">
                  <Icon name="Sparkles" size={24} className="mr-3 text-secondary" />
                  Мотивация дня
                </h3>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {motivationalTips.map((tip, idx) => (
                      <p key={idx} className="text-lg py-3 px-4 bg-muted/30 rounded-lg">
                        {tip}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collection" className="animate-fade-in">
            <div className="mb-8">
              <h3 className="text-3xl font-heading font-bold mb-4">Моя коллекция</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className={`border-2 ${rarityColors.common}`}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-4xl font-bold">{rarityStats.common}</p>
                    <p className="text-sm mt-2">Обычные карточки</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${rarityColors.rare}`}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-4xl font-bold">{rarityStats.rare}</p>
                    <p className="text-sm mt-2">Редкие карточки</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${rarityColors.epic}`}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-4xl font-bold">{rarityStats.epic}</p>
                    <p className="text-sm mt-2">Эпические карточки</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {userCards.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="pt-12 pb-12 text-center">
                  <Icon name="Package" size={64} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-2xl font-heading font-bold mb-2">Коллекция пуста</h3>
                  <p className="text-muted-foreground">Завершите первую тренировку, чтобы получить карточку</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userCards.map((card, idx) => (
                  <Card
                    key={idx}
                    className={`overflow-hidden border-2 ${rarityColors[card.rarity]} card-shine hover:scale-105 transition-transform`}
                  >
                    <div className={`h-2 bg-gradient-to-r ${rarityGradients[card.rarity]}`} />
                    <CardContent className="pt-6">
                      <div className="text-center mb-4">
                        {card.imageUrl ? (
                          <img src={card.imageUrl} alt={card.name} className="w-full h-48 object-cover rounded-lg mb-3" />
                        ) : (
                          <div className="text-6xl mb-3">{card.image}</div>
                        )}
                        <Badge className={`mb-2 ${rarityColors[card.rarity]}`}>
                          {card.rarity.toUpperCase()}
                        </Badge>
                        <h4 className="text-xl font-heading font-bold mb-1">{card.name}</h4>
                        <p className="text-xs text-muted-foreground mb-3">{card.sport}</p>
                        <p className="text-sm">{card.fact}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-secondary font-bold">
                        <Icon name="Star" size={16} />
                        <span>{rarityPoints[card.rarity]} очков</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-2">
                <CardContent className="pt-6 text-center">
                  <Icon name="Star" size={48} className="mx-auto mb-4 text-secondary" />
                  <p className="text-5xl font-heading font-bold mb-2">{totalPoints}</p>
                  <p className="text-muted-foreground">Всего очков</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6 text-center">
                  <Icon name="Library" size={48} className="mx-auto mb-4 text-primary" />
                  <p className="text-5xl font-heading font-bold mb-2">{userCards.length}</p>
                  <p className="text-muted-foreground">Карточек собрано</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6 text-center">
                  <Icon name="Flame" size={48} className="mx-auto mb-4 text-orange-500" />
                  <p className="text-5xl font-heading font-bold mb-2">{weekProgress.completed}</p>
                  <p className="text-muted-foreground">Тренировок за неделю</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-heading font-bold mb-6">Прогресс коллекции</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Обычные карточки</span>
                      <span className="font-bold">{rarityStats.common}/25</span>
                    </div>
                    <Progress value={(rarityStats.common / 25) * 100} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Редкие карточки</span>
                      <span className="font-bold">{rarityStats.rare}/15</span>
                    </div>
                    <Progress value={(rarityStats.rare / 15) * 100} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Эпические карточки</span>
                      <span className="font-bold">{rarityStats.epic}/10</span>
                    </div>
                    <Progress value={(rarityStats.epic / 10) * 100} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="animate-fade-in">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-3xl font-heading font-bold mb-6 flex items-center">
                  <Icon name="Trophy" size={32} className="mr-3 text-secondary" />
                  Глобальный рейтинг
                </h3>
                <div className="space-y-3">
                  {leaderboard.map((player) => (
                    <div
                      key={player.rank}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                        player.userId === userId
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <span className="text-2xl font-heading font-bold">#{player.rank}</span>
                      </div>
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>{player.phone[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-bold text-lg">
                          {player.userId === userId ? 'Вы' : `****${player.phone}`}
                        </p>
                        <p className="text-sm text-muted-foreground">{player.cardCount} карточек</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-heading font-bold text-secondary">{player.points}</p>
                        <p className="text-xs text-muted-foreground">очков</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showCardReveal && revealedCard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="relative max-w-md w-full">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-12 right-0"
                onClick={() => setShowCardReveal(false)}
              >
                <Icon name="X" size={24} />
              </Button>
              <div className={isFlipping ? 'animate-flip' : 'animate-scale-in'}>
                <Card className={`border-4 ${rarityColors[revealedCard.rarity]} overflow-hidden`}>
                  <div className={`h-3 bg-gradient-to-r ${rarityGradients[revealedCard.rarity]} animate-shimmer`} />
                  <CardContent className="pt-8 pb-8">
                    <Badge className={`mb-4 mx-auto block w-fit text-base px-4 py-1 ${rarityColors[revealedCard.rarity]}`}>
                      {revealedCard.rarity.toUpperCase()}
                    </Badge>
                    <div className="text-center mb-6">
                      {revealedCard.imageUrl ? (
                        <img src={revealedCard.imageUrl} alt={revealedCard.name} className="w-full h-64 object-cover rounded-lg mb-4" />
                      ) : (
                        <div className="text-8xl mb-4">{revealedCard.image}</div>
                      )}
                      <h3 className="text-3xl font-heading font-bold mb-2">{revealedCard.name}</h3>
                      <p className="text-muted-foreground mb-4">{revealedCard.sport}</p>
                      <p className="text-lg">{revealedCard.fact}</p>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-secondary text-2xl font-bold">
                      <Icon name="Star" size={28} />
                      <span>+{rarityPoints[revealedCard.rarity]} очков</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
